"""
app.py — FastAPI backend
─────────────────────────
Full persistence layer: users, images, conversions, projects, history, profile, activity.
"""

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import bcrypt
import datetime
import base64
import os

from database import get_db
from models import User, Image, Conversion, ApiUsage, ExportLog, UserActivity
from utils.activity_logger import log_activity
from utils.file_storage import save_uploaded_image

app = FastAPI(title="ER AI Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "ER AI Studio backend is running"}


# ── Register ──────────────────────────────────────────────────────────────────
@app.post("/register")
def register(payload: dict, request: Request, db: Session = Depends(get_db)):
    full_name = payload.get("full_name", "").strip()
    email     = payload.get("email", "").strip().lower()
    password  = payload.get("password", "")

    if not full_name or not email or not password:
        raise HTTPException(status_code=400, detail="full_name, email, and password are required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    new_user = User(
        full_name=full_name, email=email, password_hash=hashed,
        role="user", plan="free", is_active=True,
        email_verified=True, conversions_used_this_month=0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_activity(db, "register", user_id=new_user.id,
                 description=f"New account: {email}", ip_address=get_ip(request),
                 user_agent=request.headers.get("User-Agent"))

    return {"message": "Account created successfully", "user": _user_dict(new_user)}


# ── Login ─────────────────────────────────────────────────────────────────────
@app.post("/login")
def login(payload: dict, request: Request, db: Session = Depends(get_db)):
    email    = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_activity(db, "login_failed", description=f"Unknown email: {email}", ip_address=get_ip(request))
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        log_activity(db, "login_failed", user_id=user.id,
                     description=f"Wrong password for {email}", ip_address=get_ip(request))
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.last_login = datetime.datetime.utcnow()
    db.commit()

    log_activity(db, "login", user_id=user.id, description="Login successful",
                 ip_address=get_ip(request), user_agent=request.headers.get("User-Agent"))

    return {"message": "Login successful", "user": _user_dict(user)}


# ── Get user profile + all their data ────────────────────────────────────────
@app.get("/user/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_dict(user)


# ── Update profile (name + avatar) ───────────────────────────────────────────
@app.put("/user/{user_id}/profile")
def update_profile(user_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "full_name" in payload and payload["full_name"].strip():
        user.full_name = payload["full_name"].strip()[:100]

    if "avatar" in payload:
        # avatar is a base64 data URL — save it as a file on disk
        avatar_data = payload["avatar"]
        if avatar_data and avatar_data.startswith("data:image"):
            try:
                header, b64data = avatar_data.split(",", 1)
                ext = "jpg"
                if "png" in header:  ext = "png"
                elif "webp" in header: ext = "webp"
                img_bytes = base64.b64decode(b64data)
                avatars_dir = os.path.join(os.path.dirname(__file__), "uploads", "avatars")
                os.makedirs(avatars_dir, exist_ok=True)
                avatar_path = os.path.join(avatars_dir, f"user_{user_id}.{ext}")
                with open(avatar_path, "wb") as f:
                    f.write(img_bytes)
                user.avatar_url = avatar_data  # store full base64 for easy retrieval
            except Exception:
                pass  # ignore avatar save failure — don't break the whole request

    db.commit()
    db.refresh(user)

    log_activity(db, "profile_update", user_id=user_id,
                 description="Profile updated", ip_address=get_ip(request))

    return {"message": "Profile updated", "user": _user_dict(user)}


# ── Save a project ────────────────────────────────────────────────────────────
@app.post("/projects")
def save_project(payload: dict, request: Request, db: Session = Depends(get_db)):
    from models import Project as ProjectModel
    user_id     = payload.get("user_id")
    project_id  = payload.get("id")
    name        = payload.get("name", "Untitled")
    description = payload.get("description", "")
    db_type     = payload.get("db_type", "postgresql")
    files_json  = payload.get("files", [])
    pinned      = payload.get("pinned", False)

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    existing = db.query(ProjectModel).filter(
        ProjectModel.project_uid == project_id,
        ProjectModel.user_id == user_id
    ).first()

    if existing:
        existing.name        = name
        existing.description = description
        existing.db_type     = db_type
        existing.files_json  = files_json
        existing.pinned      = pinned
        existing.updated_at  = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return {"message": "Project updated", "id": existing.project_uid}
    else:
        proj = ProjectModel(
            project_uid=project_id, user_id=user_id, name=name,
            description=description, db_type=db_type,
            files_json=files_json, pinned=pinned,
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return {"message": "Project saved", "id": proj.project_uid}


# ── Get all projects for a user ───────────────────────────────────────────────
@app.get("/projects/{user_id}")
def get_projects(user_id: int, db: Session = Depends(get_db)):
    from models import Project as ProjectModel
    projects = db.query(ProjectModel).filter(ProjectModel.user_id == user_id).all()
    return [_project_dict(p) for p in projects]


# ── Delete a project ──────────────────────────────────────────────────────────
@app.delete("/projects/{user_id}/{project_uid}")
def delete_project(user_id: int, project_uid: str, db: Session = Depends(get_db)):
    from models import Project as ProjectModel
    proj = db.query(ProjectModel).filter(
        ProjectModel.project_uid == project_uid,
        ProjectModel.user_id == user_id
    ).first()
    if proj:
        db.delete(proj)
        db.commit()
    return {"message": "Deleted"}


# ── Save quick convert history entry ─────────────────────────────────────────
@app.post("/quick-history")
def save_quick_history(payload: dict, db: Session = Depends(get_db)):
    from models import QuickHistory
    user_id     = payload.get("user_id")
    entry_id    = payload.get("id")
    filename    = payload.get("filename", "")
    sql         = payload.get("sql", "")
    stats       = payload.get("stats", {})
    processing_time = payload.get("processingTime", 0)

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    qh = QuickHistory(
        entry_uid=entry_id, user_id=user_id, filename=filename,
        sql=sql, stats_json=stats, processing_time_ms=processing_time,
    )
    db.add(qh)
    db.commit()
    return {"message": "Saved"}


# ── Get quick history for a user ──────────────────────────────────────────────
@app.get("/quick-history/{user_id}")
def get_quick_history(user_id: int, db: Session = Depends(get_db)):
    from models import QuickHistory
    entries = (
        db.query(QuickHistory)
        .filter(QuickHistory.user_id == user_id)
        .order_by(QuickHistory.created_at.desc())
        .limit(20)
        .all()
    )
    return [_quick_history_dict(e) for e in entries]


# ── Clear quick history for a user ───────────────────────────────────────────
@app.delete("/quick-history/{user_id}")
def clear_quick_history(user_id: int, db: Session = Depends(get_db)):
    from models import QuickHistory
    db.query(QuickHistory).filter(QuickHistory.user_id == user_id).delete()
    db.commit()
    return {"message": "Cleared"}


# ── Upload image ──────────────────────────────────────────────────────────────
@app.post("/upload-image")
async def upload_image(request: Request, user_id: int = Form(...),
                       image: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if image.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, WEBP allowed")

    file_bytes = await image.read()
    file_info  = save_uploaded_image(file_bytes, image.filename, image.content_type)

    db_image = Image(
        user_id=user_id, filename=file_info["filename"],
        original_filename=file_info["original_filename"],
        file_path=file_info["file_path"],
        file_size_bytes=file_info["file_size_bytes"],
        mime_type=file_info["mime_type"],
        is_processed=False, processing_status="pending",
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)

    log_activity(db, "upload", user_id=user_id,
                 description=f"Uploaded: {image.filename}", ip_address=get_ip(request),
                 metadata={"image_id": db_image.id, "filename": image.filename})

    return {"message": "Uploaded", "image_id": db_image.id,
            "filename": db_image.original_filename, "status": db_image.processing_status}


# ── Save conversion ───────────────────────────────────────────────────────────
@app.post("/save-conversion")
def save_conversion(payload: dict, request: Request, db: Session = Depends(get_db)):
    user_id       = payload.get("user_id")
    image_id      = payload.get("image_id")
    generated_ddl = payload.get("generated_ddl", "")
    dialect       = payload.get("dialect", "postgresql")
    success       = payload.get("success", True)
    error_message = payload.get("error_message")
    exec_time     = payload.get("execution_time_ms")
    tables_count  = payload.get("tables_count", 0)
    rels_count    = payload.get("relationships_count", 0)

    if not user_id or not image_id:
        raise HTTPException(status_code=400, detail="user_id and image_id required")

    db_image = db.query(Image).filter(Image.id == image_id).first()
    if db_image:
        db_image.is_processed      = success
        db_image.processing_status = "completed" if success else "failed"
        db.commit()

    conv = Conversion(user_id=user_id, image_id=image_id, generated_ddl=generated_ddl,
                      dialect=dialect, success=success, error_message=error_message,
                      execution_time_ms=exec_time, tables_count=tables_count,
                      relationships_count=rels_count)
    db.add(conv)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.conversions_used_this_month += 1
    db.commit()
    db.refresh(conv)

    log_activity(db, "convert", user_id=user_id,
                 description=f"Generated {dialect.upper()} DDL", ip_address=get_ip(request),
                 metadata={"conversion_id": conv.id, "dialect": dialect, "tables": tables_count})

    api_log = ApiUsage(user_id=user_id, endpoint="/api/analyze",
                       model_used="mistral-small-latest",
                       processing_time_ms=exec_time, success=success)
    db.add(api_log)
    db.commit()

    return {"message": "Saved", "conversion_id": conv.id}


# ── Record a Razorpay payment + upgrade plan atomically ──────────────────────
@app.post("/payments")
def record_payment(payload: dict, request: Request, db: Session = Depends(get_db)):
    from models import Payment
    user_id             = payload.get("user_id")
    razorpay_order_id   = payload.get("razorpay_order_id")
    razorpay_payment_id = payload.get("razorpay_payment_id")
    razorpay_signature  = payload.get("razorpay_signature")
    amount_paise        = payload.get("amount_paise", 19900)   # ₹199 default
    plan_purchased      = payload.get("plan_purchased", "pro")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Upgrade the plan
    user.plan = plan_purchased if plan_purchased in ("free", "pro") else "pro"

    # Insert payment record
    payment = Payment(
        user_id=user_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
        amount_paise=amount_paise,
        currency="INR",
        plan_purchased=plan_purchased,
        status="paid",
        verified_at=datetime.datetime.utcnow(),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    log_activity(db, "upgrade", user_id=user_id,
                 description=f"Upgraded to {plan_purchased} via Razorpay",
                 ip_address=get_ip(request),
                 metadata={"payment_id": payment.id,
                           "razorpay_payment_id": razorpay_payment_id,
                           "amount_paise": amount_paise})

    return {"message": "Payment recorded", "payment_id": payment.id, "user": _user_dict(user)}


# ── Get payments for a user ───────────────────────────────────────────────────
@app.get("/payments/{user_id}")
def get_payments(user_id: int, db: Session = Depends(get_db)):
    from models import Payment
    rows = (db.query(Payment)
              .filter(Payment.user_id == user_id)
              .order_by(Payment.created_at.desc())
              .all())
    return [
        {
            "id": p.id,
            "razorpay_order_id":   p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "amount_paise":        p.amount_paise,
            "plan_purchased":      p.plan_purchased,
            "status":              p.status,
            "created_at":          str(p.created_at),
            "verified_at":         str(p.verified_at) if p.verified_at else None,
        }
        for p in rows
    ]


# ── Update user plan ──────────────────────────────────────────────────────────
@app.put("/user/{user_id}/plan")
def update_plan(user_id: int, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = payload.get("plan", "free")
    if plan not in ("free", "pro"):
        raise HTTPException(status_code=400, detail="plan must be 'free' or 'pro'")
    user.plan = plan
    db.commit()
    db.refresh(user)
    return {"message": "Plan updated", "user": _user_dict(user)}


# ── Increment conversions used this month ────────────────────────────────────
@app.post("/increment-conversions/{user_id}")
def increment_conversions(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.conversions_used_this_month += 1
    db.commit()
    return {"conversions_used_this_month": user.conversions_used_this_month}


# ── Log export ────────────────────────────────────────────────────────────────
@app.post("/log-export")
def log_export(payload: dict, request: Request, db: Session = Depends(get_db)):
    user_id       = payload.get("user_id")
    conversion_id = payload.get("conversion_id")
    fmt           = payload.get("format", "copy")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    export = ExportLog(user_id=user_id, conversion_id=conversion_id, format=fmt)
    db.add(export)
    db.commit()
    log_activity(db, "export", user_id=user_id,
                 description=f"Exported as {fmt}", ip_address=get_ip(request))
    return {"message": "Logged"}


# ── Save tool history entry ───────────────────────────────────────────────────
@app.post("/tool-history")
def save_tool_history(payload: dict, db: Session = Depends(get_db)):
    from models import ToolHistory
    import uuid
    user_id          = payload.get("user_id")
    tool             = payload.get("tool", "")
    action_label     = payload.get("action_label", "")
    result_sql       = payload.get("result_sql", "")
    dialect_from     = payload.get("dialect_from")
    dialect_to       = payload.get("dialect_to")
    tables_count     = payload.get("tables_count", 0)
    processing_time  = payload.get("processing_time_ms", 0)
    success          = payload.get("success", True)
    extra_json       = payload.get("extra_json", {})

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    entry = ToolHistory(
        entry_uid=str(uuid.uuid4()),
        user_id=user_id,
        tool=tool,
        action_label=action_label,
        result_sql=result_sql,
        dialect_from=dialect_from,
        dialect_to=dialect_to,
        tables_count=tables_count,
        processing_time_ms=processing_time,
        success=success,
        extra_json=extra_json,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"message": "Saved", "id": entry.entry_uid}


# ── Get tool history for a user ───────────────────────────────────────────────
@app.get("/tool-history/{user_id}")
def get_tool_history(user_id: int, limit: int = 100, db: Session = Depends(get_db)):
    from models import ToolHistory
    entries = (
        db.query(ToolHistory)
        .filter(ToolHistory.user_id == user_id)
        .order_by(ToolHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_tool_history_dict(e) for e in entries]


# ── Delete single tool history entry ─────────────────────────────────────────
@app.delete("/tool-history/{user_id}/{entry_uid}")
def delete_tool_history_entry(user_id: int, entry_uid: str, db: Session = Depends(get_db)):
    from models import ToolHistory
    entry = db.query(ToolHistory).filter(
        ToolHistory.user_id == user_id,
        ToolHistory.entry_uid == entry_uid
    ).first()
    if entry:
        db.delete(entry)
        db.commit()
    return {"message": "Deleted"}


# ── Clear all tool history for a user ────────────────────────────────────────
@app.delete("/tool-history/{user_id}")
def clear_tool_history(user_id: int, db: Session = Depends(get_db)):
    from models import ToolHistory
    db.query(ToolHistory).filter(ToolHistory.user_id == user_id).delete()
    db.commit()
    return {"message": "Cleared"}


def _tool_history_dict(e) -> dict:
    return {
        "id": e.entry_uid,
        "tool": e.tool,
        "action_label": e.action_label,
        "result_sql": e.result_sql or "",
        "dialect_from": e.dialect_from,
        "dialect_to": e.dialect_to,
        "tables_count": e.tables_count,
        "processing_time_ms": e.processing_time_ms or 0,
        "success": e.success,
        "extra_json": e.extra_json or {},
        "created_at": int(e.created_at.timestamp() * 1000),
    }


@app.get("/activity/{user_id}")
def user_activity_log(user_id: int, db: Session = Depends(get_db)):
    logs = (db.query(UserActivity)
            .filter(UserActivity.user_id == user_id)
            .order_by(UserActivity.timestamp.desc())
            .limit(50).all())
    return [{"id": a.id, "activity_type": a.activity_type,
             "description": a.description, "timestamp": str(a.timestamp)} for a in logs]


# ── All users (admin) ─────────────────────────────────────────────────────────
@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return [_user_dict(u) for u in db.query(User).all()]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "plan": u.plan,
        "is_active": u.is_active,
        "email_verified": getattr(u, "email_verified", True),
        "avatar": getattr(u, "avatar_url", None),
        "created_at": str(u.created_at),
        "last_login": str(u.last_login) if u.last_login else None,
        "conversions_used_this_month": u.conversions_used_this_month,
    }

def _project_dict(p) -> dict:
    return {
        "id": p.project_uid,
        "user_id": p.user_id,
        "name": p.name,
        "description": p.description or "",
        "db_type": p.db_type,
        "files": p.files_json or [],
        "pinned": p.pinned or False,
        "created_at": str(p.created_at),
        "updated_at": str(p.updated_at),
    }

def _quick_history_dict(e) -> dict:
    return {
        "id": e.entry_uid,
        "filename": e.filename,
        "sql": e.sql,
        "stats": e.stats_json or {},
        "processingTime": e.processing_time_ms or 0,
        "timestamp": int(e.created_at.timestamp() * 1000),
        "imageUrl": "",
    }
