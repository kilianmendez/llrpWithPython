from database import get_db, Base, engine
Base.metadata.create_all(bind=engine)
from fastapi import FastAPI, WebSocket, Depends, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from models import TagReading, Product, User, LoginInput
import datetime
import asyncio
import threading
import queue
import time
import json
import os
import shutil
from typing import Optional, Set, List
from sllurp import llrp
from unittest.mock import MagicMock
from models import ProductOut
from sllurp.llrp import LLRPReaderClient, LLRPReaderConfig, LLRP_DEFAULT_PORT


# --- CONFIGURACIÓN APP Y SEGURIDAD -------------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "superclave123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

Base.metadata.create_all(bind=engine)

# --- UTILS AUTENTICACIÓN -----------------------------------------------------------------

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# --- MODELOS Pydantic ---------------------------------------------------------------------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class ProductOut(BaseModel):
    id: int
    epc: str
    name: str
    description: str
    stock: int
    image_url: str
    creator_id: int  # ✅ Necesario para permisos en el frontend

    model_config = {
        "from_attributes": True  # ✅ Sintaxis correcta en Pydantic v2
    }     

# --- REGISTRO Y LOGIN ---------------------------------------------------------------------

@app.post("/register/")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    hashed_pw = get_password_hash(user.password)
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user_id": new_user.id}

from fastapi.security import OAuth2PasswordRequestForm

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": user.is_admin,  # ✅ devolvemos si es admin
        "user_id": user.id
    }


@app.get("/usuarios/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "name": current_user.name,
        "is_admin": current_user.is_admin  # ✅ nuevo campo
    }





# --- ADMIN -------------------------------------------------------------

@app.put("/users/set-admin/{user_id}")
def set_user_admin_status(
    user_id: int,
    make_admin: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para cambiar roles")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_admin = make_admin
    db.commit()
    return {"status": "success", "user_id": user.id, "is_admin": user.is_admin}


# --- USERS -------------------------------------------------------------

@app.get("/users/")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "is_admin": u.is_admin} for u in users]


# --- VARIABLES GLOBALES RFID -------------------------------------------------------------

reader: Optional[llrp.LLRPClient] = None
tag_queue = queue.Queue()
active_websockets: Set[WebSocket] = set()

os.makedirs("images", exist_ok=True)

# --- FUNCIONES RFID ----------------------------------------------------------------------

def tag_report_callback(_, tags):
    if tags:
        db = next(get_db())
        try:
            for tag in tags:
                print("📥 Lectura recibida:", tag)

                # Decodificar EPC
                raw_epc = tag.get("EPC-96", b"")
                epc_str = raw_epc.decode("utf-8") if isinstance(raw_epc, bytes) else str(raw_epc)

                # Buscar producto con ese EPC
                product = db.query(Product).filter(Product.epc == epc_str).first()
                display_name = product.name if product else epc_str

                # Timestamp convertido
                timestamp_raw = tag.get("LastSeenTimestampUTC", time.time())
                timestamp = datetime.datetime.utcfromtimestamp(timestamp_raw / 1e6)

                tag_data = {
                    "epc": epc_str,
                    "name": display_name,  # ✅ nombre o EPC si no hay producto
                    "antenna": tag.get("AntennaID", "N/A"),
                    "rssi": tag.get("PeakRSSI", "N/A"),
                    "timestamp": timestamp,
                    "count": tag.get("TagSeenCount", 1)
                }

                # Guardar o actualizar lectura en la base de datos
                existing_tag = db.query(TagReading).filter(TagReading.epc == epc_str).first()
                if existing_tag:
                    existing_tag.antenna = tag_data["antenna"]
                    existing_tag.rssi = tag_data["rssi"]
                    existing_tag.timestamp = tag_data["timestamp"]
                    existing_tag.count = tag_data["count"]
                else:
                    db_tag = TagReading(**tag_data)
                    db.add(db_tag)

                # Enviar al frontend
                tag_queue.put(tag_data)

            db.commit()
        except Exception as e:
            print("❌ Error saving tag:", e)
        finally:
            db.close()


# --- CONEXIÓN LECTOR RFID ----------------------------------------------------------------

class ConnectionRequest(BaseModel):
    ip_address: str
    simulation_mode: bool = False

@app.post("/connect")
async def connect_reader(request: ConnectionRequest):
    global reader
    if reader:
        return {"status": "error", "message": "Reader already connected"}

    try:
        if request.simulation_mode:
            reader = MagicMock()

            def add_tag_report_callback(cb):
                def simulate():
                    count = 0
                    while reader:
                        simulated_tags = [{
                            "EPC-96": f"E200{count:04d}",
                            "AntennaID": 1,
                            "PeakRSSI": -40,
                            "LastSeenTimestampUTC": int(time.time()),
                            "TagSeenCount": count + 1
                        }]
                        cb(reader, simulated_tags)
                        count += 1
                        time.sleep(2)

                threading.Thread(target=simulate, daemon=True).start()

            reader.add_tag_report_callback = add_tag_report_callback
            reader.disconnect = lambda: None
            reader.add_tag_report_callback(tag_report_callback)

            return {"status": "success", "message": "Connected in simulation mode"}

        # ✅ CONEXIÓN REAL (NUEVA API sllurp)
        config = LLRPReaderConfig({
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
        })

        reader = LLRPReaderClient(request.ip_address, LLRP_DEFAULT_PORT, config)
        reader.add_tag_report_callback(tag_report_callback)

        def connect_reader():
            try:
                reader.connect()
            except Exception as e:
                print("❌ Error al conectar el lector:", e)

        threading.Thread(target=connect_reader, daemon=True).start()

        return {"status": "success", "message": "Connected to RFID reader"}

    except Exception as e:
        reader = None
        return {"status": "error", "message": str(e)}


@app.post("/disconnect")
async def disconnect_reader():
    global reader
    if reader:
        reader.disconnect()
        reader = None
        return {"status": "success", "message": "Reader disconnected"}
    return {"status": "error", "message": "No reader connected"}

@app.get("/readings")
def get_readings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(TagReading).offset(skip).limit(limit).all()

@app.on_event("startup")
async def startup_event():
    print("🚀 Iniciando servidor FastAPI...")

    # Crear admin si no existe
    db = next(get_db())
    email = "admin@gmail.com"
    if not db.query(User).filter(User.email == email).first():
        user = User(
            name="Admin",
            email=email,
            hashed_password=get_password_hash("admin"),
            is_admin=True
        )
        db.add(user)
        db.commit()
        print("👤 Usuario admin creado por defecto")
    db.close()

    # Lanzar tarea de broadcast de tags
    if not hasattr(app.state, "broadcast_task"):
        app.state.broadcast_task = asyncio.create_task(broadcast_tags())
        print("📡 broadcast_tags lanzado correctamente")

# --- WEBSOCKETS --------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🌐 Cliente WebSocket conectado")
    active_websockets.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception as e:
        print("❌ WebSocket cerrado:", e)
    finally:
        active_websockets.discard(websocket)


async def broadcast_tags():
    while True:
        if active_websockets:
            try:
                tag_data = tag_queue.get_nowait()
                print("📡 Enviando a clientes:", tag_data)

                # Mandar a todos los clientes conectados
                disconnected = set()
                for ws in active_websockets:
                    try:
                        await ws.send_text(json.dumps({
                            **tag_data,
                            "timestamp": tag_data["timestamp"].isoformat()
                        }))
                    except Exception as e:
                        print("❌ Error enviando a WebSocket, lo quitamos:", e)
                        disconnected.add(ws)

                # Eliminar sockets caídos
                for ws in disconnected:
                    active_websockets.discard(ws)

            except queue.Empty:
                await asyncio.sleep(0.1)
        else:
            await asyncio.sleep(0.1)


# --- CRUD PRODUCTOS ----------------------------------------------------------------------

@app.post("/products/upload/")
def upload_product_with_image(
    epc: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    stock: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ añadimos el usuario logueado
):
    if db.query(Product).filter(Product.epc == epc).first():
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese EPC")
    path = f"images/{image.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    product = Product(
        epc=epc,
        name=name,
        description=description,
        stock=stock,
        image_url=path,
        creator_id=current_user.id  # ✅ se guarda el autor
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"status": "success", "product": product}


@app.get("/products/", response_model=List[ProductOut])
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@app.delete("/products/delete/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if product.creator_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este producto")

    if os.path.exists(product.image_url):
        os.remove(product.image_url)

    db.delete(product)
    db.commit()
    return {"status": "success", "message": "Producto eliminado"}


@app.put("/products/update/{product_id}")
def update_product(
    product_id: int,
    epc: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    stock: int = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product.creator_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar este producto")

    if epc != product.epc and db.query(Product).filter(Product.epc == epc).first():
        raise HTTPException(status_code=400, detail="Otro producto ya tiene ese EPC")

    if image:
        if os.path.exists(product.image_url):
            os.remove(product.image_url)
        path = f"images/{image.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        product.image_url = path

    product.epc = epc
    product.name = name
    product.description = description
    product.stock = stock

    db.commit()
    db.refresh(product)
    return {"status": "success", "product": product}


# --- SERVIR ARCHIVOS ESTÁTICOS ----------------------------------------------------------

app.mount("/images", StaticFiles(directory="images"), name="images")

@app.get("/")
async def root():
    return {"message": "Servidor FastAPI activo y esperando conexiones WebSocket."}
