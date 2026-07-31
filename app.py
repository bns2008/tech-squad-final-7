from fastapi import FastAPI, HTTPException
from database import SessionLocal
from models import User
import bcrypt

app = FastAPI()



@app.get("/")
def home():
    return {"message": "Backend is running"}

@app.post("/register")
def register(user: dict):

    db = SessionLocal()

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user["email"]).first()

    if existing_user:
        db.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    # Hash password
    hashed_password = bcrypt.hashpw(
        user["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    # Create new user
    new_user = User(
        full_name=user["full_name"],
        email=user["email"],
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {
        "message": "Registration Successful"
    }