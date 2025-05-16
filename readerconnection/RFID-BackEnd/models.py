from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from pydantic import BaseModel, EmailStr

# --- MODELOS SQLALCHEMY ---

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    epc = Column(String, unique=True, index=True)
    name = Column(String)
    description = Column(String)
    stock = Column(Integer)
    image_url = Column(String)
    creator_id = Column(Integer, ForeignKey("users.id"))

    creator = relationship("User", backref="products")


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
    is_admin = Column(Boolean, default=False)


# --- MODELOS Pydantic ---

class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ProductOut(BaseModel):
    id: int
    epc: str
    name: str
    description: str
    stock: int
    image_url: str
    creator_id: int

    model_config = {
        "from_attributes": True  # ✅ para Pydantic v2
    }
