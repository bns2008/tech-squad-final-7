from fastapi import FastAPI, HTTPException
from database import SessionLocal
from models import User
import bcrypt

app = FastAPI()



@app.get("/")
def home():
    return {"message": "Backend is running"}

