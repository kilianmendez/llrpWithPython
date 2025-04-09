from fastapi import FastAPI, WebSocket, Depends
from sqlalchemy.orm import Session
from models import TagReading, get_db
import datetime
from sllurp import llrp
from unittest.mock import MagicMock
import asyncio
import threading
import queue
import time
import json
from typing import Optional, Set
from pydantic import BaseModel

app = FastAPI()

# Global variables for reader state
reader: Optional[llrp.LLRPClient] = None
tag_queue = queue.Queue()
active_websockets: Set[WebSocket] = set()

def tag_report_callback(_, tags):
    """Called when tags are reported by the reader"""
    if tags:
        db = next(get_db())
        for tag in tags:
            tag_data = {
                "epc": tag.get("EPC-96", "N/A"),
                "antenna": tag.get("AntennaID", "N/A"),
                "rssi": tag.get("PeakRSSI", "N/A"),
                "timestamp": tag.get("LastSeenTimestampUTC", "N/A"),
                "count": tag.get("TagSeenCount", "N/A")
            }
            
            # Check if tag already exists
            existing_tag = db.query(TagReading).filter(TagReading.epc == tag_data["epc"]).first()
            
            if existing_tag:
                # Update existing tag
                existing_tag.antenna = tag_data["antenna"]
                existing_tag.rssi = tag_data["rssi"]
                existing_tag.timestamp = datetime.datetime.utcfromtimestamp(tag_data["timestamp"])
                existing_tag.count = tag_data["count"]
            else:
                # Create new tag
                db_tag = TagReading(
                    epc=tag_data["epc"],
                    antenna=tag_data["antenna"],
                    rssi=tag_data["rssi"],
                    timestamp=datetime.datetime.utcfromtimestamp(tag_data["timestamp"]),
                    count=tag_data["count"]
                )
                db.add(db_tag)
            
            # Add to WebSocket queue
            tag_queue.put(tag_data)
            
        # Commit all changes at once
        db.commit()
        db.close()

# Add new endpoint to query readings
@app.get("/readings/")
def get_readings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    readings = db.query(TagReading).offset(skip).limit(limit).all()
    return readings

class ConnectionRequest(BaseModel):
    ip_address: str
    simulation_mode: bool = False

@app.get("/")
async def root():
    return {"message": "Servidor FastAPI activo y esperando conexiones WebSocket."}

@app.post("/connect")
async def connect_reader(request: ConnectionRequest):
    global reader
    
    if reader:
        return {"status": "error", "message": "Reader is already connected"}
    
    try:
        if request.simulation_mode:
            reader = MagicMock()
            def add_tag_report_callback(cb):
                def simulate():
                    count = 0
                    while reader:
                        simulated_tags = []
                        for i in range(2):
                            tag = {
                                "EPC-96": f"E200{i:04d}",
                                "AntennaID": (i % 2) + 1,
                                "PeakRSSI": -40 - i * 5,
                                "LastSeenTimestampUTC": int(time.time()),
                                "TagSeenCount": count + 1
                            }
                            simulated_tags.append(tag)
                        cb(reader, simulated_tags)
                        count += 1
                        time.sleep(2)
                
                threading.Thread(target=simulate, daemon=True).start()
            
            reader.add_tag_report_callback = add_tag_report_callback
            reader.disconnect = lambda: None
            reader.add_tag_report_callback(tag_report_callback)
            return {"status": "success", "message": "Connected in simulation mode"}
        
        config = {
            'tag_content_selector': {
                'EnableROSpecID': True,
                'EnableSpecIndex': True,
                'EnableInventoryParameterSpecID': True,
                'EnableAntennaID': True,
                'EnableChannelIndex': True,
                'EnablePeakRSSI': True,
                'EnableFirstSeenTimestamp': True,
                'EnableLastSeenTimestamp': True,
                'EnableTagSeenCount': True,
                'EnableAccessSpecID': True
            },
            'start_inventory': True,
            'report_every_n_tags': 1,
            'antennas': [1],
            'tx_power': 0,
            'mode_identifier': 1000,
            'session': 2,
            'tag_population': 4
        }
        
        reader = llrp.LLRPClient(request.ip_address, 5084, config)
        connect_error = None
        
        def connect_thread():
            nonlocal connect_error
            try:
                reader.connect()
                reader.add_tag_report_callback(tag_report_callback)
            except Exception as e:
                connect_error = str(e)
        
        thread = threading.Thread(target=connect_thread, daemon=True)
        thread.start()
        thread.join(timeout=5)  # Wait up to 5 seconds for connection
        
        if connect_error:
            reader = None
            return {"status": "error", "message": connect_error}
        
        if reader:
            return {"status": "success", "message": "Connected to RFID reader"}
        else:
            reader = None
            return {"status": "error", "message": "Connection timeout or failed"}
            
    except Exception as e:
        reader = None
        return {"status": "error", "message": str(e)}

@app.post("/disconnect")
async def disconnect_reader():
    global reader
    
    if not reader:
        return {"status": "error", "message": "No reader is connected"}
    
    try:
        reader.disconnect()
        reader = None
        return {"status": "success", "message": "Reader disconnected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def broadcast_tags():
    """Background task to broadcast tag data to all connected websockets"""
    while True:
        try:
            # Check if there are any active websockets
            if not active_websockets:
                await asyncio.sleep(0.1)
                continue

            # Try to get a tag from the queue
            try:
                tag_data = tag_queue.get_nowait()
                # Broadcast to all connected websockets
                disconnected = set()
                for websocket in active_websockets:
                    try:
                        await websocket.send_text(json.dumps(tag_data))
                    except Exception:
                        disconnected.add(websocket)
                
                # Remove disconnected websockets
                active_websockets.difference_update(disconnected)
            except queue.Empty:
                await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Error in broadcast task: {e}")
            await asyncio.sleep(1)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    
    try:
        # Create broadcast task if it doesn't exist
        if not hasattr(app.state, "broadcast_task"):
            app.state.broadcast_task = asyncio.create_task(broadcast_tags())
        
        # Keep the connection alive
        while True:
            await websocket.receive_text()  # This will wait for any message from client
            
    except Exception as e:
        print(f"WebSocket connection closed: {e}")
    finally:
        active_websockets.discard(websocket)
