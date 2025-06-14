from fastapi import FastAPI
from enum import Enum
from pydantic import BaseModel


app = FastAPI()

class ModelName(str, Enum):
    samsung = "samsung"
    apple = "apple"
    google = "google"

class Item(BaseModel):
    name: str
    id: int

items_list = [
    Item(name="Foo", id=1),
    Item(name="Bar", id=2),
    Item(name="Baz", id=3),
]


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    items = filter(lambda item: item.id == item_id, items_list)
    return list(items) 

@app.get("/models/{model_name}")
async def read_model(model_name: ModelName):
    if model_name is ModelName.samsung:
        return {"model_name": model_name, "message": "samsung is ok i guess"}
    elif model_name == ModelName.apple:
        return {"model_name": model_name, "message": "apple is the best"}
    elif model_name == ModelName.google:
        return {"model_name": model_name, "message": "google is the devil!"}

fake_items_db = [{"item_name": "Foo"}, {"item_name": "Bar"}, {"item_name": "Baz"}]


@app.get("/items/")
async def read_item(skip: int = 0, limit: int = 10):
    return fake_items_db[skip : skip + limit]