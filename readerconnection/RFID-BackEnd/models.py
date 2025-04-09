from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class TagReading(Base):
    __tablename__ = "tag_readings"

    id = Column(Integer, primary_key=True, index=True)
    epc = Column(String, index=True)
    antenna = Column(Integer)
    rssi = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(datetime.timezone.utc))
    count = Column(Integer)

# Create database engine
DATABASE_URL = "sqlite:///./rfid_readings.db"
engine = create_engine(DATABASE_URL)

# Create tables
Base.metadata.create_all(bind=engine)

# SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()