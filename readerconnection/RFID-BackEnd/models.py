from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from database import Base  # ✅ Usamos el Base correcto

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    epc = Column(String, unique=True, index=True)
    name = Column(String)
    description = Column(String)
    stock = Column(Integer)
    image_url = Column(String)

class TagReading(Base):
    __tablename__ = "tag_readings"
    id = Column(Integer, primary_key=True, index=True)
    epc = Column(String, index=True)
    antenna = Column(Integer)
    rssi = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    count = Column(Integer)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)  # ✅ nuevo campo

# Solo este Pydantic schema es necesario aquí
from pydantic import BaseModel, EmailStr

class LoginInput(BaseModel):
    email: EmailStr
    password: str
