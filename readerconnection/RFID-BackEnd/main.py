from fastapi import FastAPI, WebSocket, Depends, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from models import TagReading, Product, get_db
import datetime
from sllurp import llrp
from unittest.mock import MagicMock
import asyncio
import threading
import queue
import time
import json
import os
import shutil
from typing import Optional, Set, List
from pydantic import BaseModel

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for reader state
reader: Optional[llrp.LLRPClient] = None
tag_queue = queue.Queue()
active_websockets: Set[WebSocket] = set()

# Crear carpeta para imágenes si no existe
os.makedirs("images", exist_ok=True)

# --- FUNCIONES RFID ----------------------------------------------------------------------

def tag_report_callback(_, tags):
    if tags:
        db = next(get_db())
        try:
            for tag in tags:
                timestamp = tag.get("LastSeenTimestampUTC")
                if not isinstance(timestamp, (int, float)):
                    timestamp = time.time()

                tag_data = {
                    "epc": tag.get("EPC-96", "N/A"),
                    "antenna": tag.get("AntennaID", "N/A"),
                    "rssi": tag.get("PeakRSSI", "N/A"),
                    "timestamp": datetime.datetime.utcfromtimestamp(timestamp),
                    "count": tag.get("TagSeenCount", 1)
                }

                print("Etiqueta procesada:", tag_data)

                existing_tag = db.query(TagReading).filter(TagReading.epc == tag_data["epc"]).first()

                if existing_tag:
                    existing_tag.antenna = tag_data["antenna"]
                    existing_tag.rssi = tag_data["rssi"]
                    existing_tag.timestamp = tag_data["timestamp"]
                    existing_tag.count = tag_data["count"]
                else:
                    db_tag = TagReading(
                        epc=tag_data["epc"],
                        antenna=tag_data["antenna"],
                        rssi=tag_data["rssi"],
                        timestamp=tag_data["timestamp"],
                        count=tag_data["count"]
                    )
                    db.add(db_tag)

                tag_queue.put(tag_data)
                print("Tag saved:", tag_data)

            db.commit()
        except Exception as e:
            print("Error saving tag:", e)
        finally:
            db.close()

# --- API ROOT ----------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "Servidor FastAPI activo y esperando conexiones WebSocket."}

# --- CONEXIÓN RFID -----------------------------------------------------------------------

class ConnectionRequest(BaseModel):
    ip_address: str
    simulation_mode: bool = False

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
        thread.join(timeout=5)

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

# --- TAG READINGS & WEBSOCKETS ----------------------------------------------------------

@app.get("/readings/")
def get_readings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    readings = db.query(TagReading).offset(skip).limit(limit).all()
    return readings

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)

    try:
        if not hasattr(app.state, "broadcast_task"):
            app.state.broadcast_task = asyncio.create_task(broadcast_tags())

        while True:
            await websocket.receive_text()
    except Exception as e:
        print(f"WebSocket connection closed: {e}")
    finally:
        active_websockets.discard(websocket)

async def broadcast_tags():
    while True:
        try:
            if not active_websockets:
                await asyncio.sleep(0.1)
                continue

            try:
                tag_data = tag_queue.get_nowait()
                disconnected = set()
                for websocket in active_websockets:
                    try:
                        tag_copy = tag_data.copy()
                        if isinstance(tag_copy["timestamp"], datetime.datetime):
                            tag_copy["timestamp"] = tag_copy["timestamp"].isoformat()
                        await websocket.send_text(json.dumps(tag_copy))
                    except Exception:
                        disconnected.add(websocket)

                active_websockets.difference_update(disconnected)
            except queue.Empty:
                await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Error in broadcast task: {e}")
            await asyncio.sleep(1)

# --- PRODUCTOS CRUD ----------------------------------------------------------------------

@app.post("/products/upload/")
def upload_product_with_image(
    epc: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    stock: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    existing = db.query(Product).filter(Product.epc == epc).first()
    if existing:
        return {"status": "error", "message": "Ya existe un producto con ese EPC"}

    file_location = f"images/{image.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    product = Product(
        epc=epc,
        name=name,
        description=description,
        stock=stock,
        image_url=file_location
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return {"status": "success", "product": {
        "id": product.id,
        "epc": product.epc,
        "name": product.name,
        "description": product.description,
        "stock": product.stock,
        "image_url": f"/{file_location}"
    }}

class ProductOut(BaseModel):
    id: int
    epc: str
    name: str
    description: str
    stock: int
    image_url: str

    class Config:
        orm_mode = True

@app.get("/products/", response_model=List[ProductOut])
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product.image_url and os.path.exists(product.image_url):
        os.remove(product.image_url)

    db.delete(product)
    db.commit()
    return {"status": "success", "message": f"Producto con ID {product_id} eliminado"}

# --- SERVIR ARCHIVOS ESTÁTICOS ----------------------------------------------------------

app.mount("/images", StaticFiles(directory="images"), name="images")
