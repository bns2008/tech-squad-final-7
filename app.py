from fastapi import FastAPI, HTTPException
from database import SessionLocal
from models import User
import bcrypt

app = FastAPI()



@app.get("/")
def home():
    return {"message": "Backend is running"}

@app.post("/login")
def login(user: dict):

    db = SessionLocal()

    existing_user = db.query(User).filter(
        User.email == user["email"]
    ).first()

    if not existing_user:
        db.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_correct = bcrypt.checkpw(
        user["password"].encode(),
        existing_user.password_hash.encode()
    )

    if not password_correct:
        db.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    db.close()

    
      return {
    "access_token": access_token,
    "token_type": "bearer",
    "user": {
        "id": existing_user.id,
        "full_name": existing_user.full_name,
        "email": existing_user.email
    }
}
