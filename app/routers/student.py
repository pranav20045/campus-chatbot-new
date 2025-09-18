from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import QueryCreate
import ai_engine
from ..auth import get_current_user, create_access_token, verify_password, get_password_hash
from fastapi import HTTPException
from fastapi import Form
import os
import re

router = APIRouter(prefix="/api", tags=["student"])  # also holds /auth

@router.post("/auth/login")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
	user = db.query(models.User).filter(models.User.email == email).first()
	if not user or not verify_password(password, user.password_hash):
		raise HTTPException(status_code=400, detail="Invalid credentials")
	token = create_access_token({"sub": str(user.id), "role": user.role})
	return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/auth/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db)
):
    role = role.lower().strip()
    if role not in {"student", "staff", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(email=email, password_hash=get_password_hash(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

def _norm(s: str) -> str:
	return re.sub(r"\s+", " ", s.lower().strip())

@router.post("/student/ask")
def ask_question(payload: QueryCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
    orig_q = payload.question

    # Use new AI engine to get a response based on Chroma + Gemini
    answer = ai_engine.get_bot_response(orig_q)

    # Heuristic: if engine indicates insufficient info/forwarding, mark as pending_staff
    low = (answer or "").lower()
    forwarding_markers = [
        "forwarded to the administration",
        "don't have enough information",
        "do not have enough information",
        "sorry, i don't have enough information",
    ]
    if any(m in low for m in forwarding_markers) or not answer.strip():
        q = models.Query(student_id=user.id, question=orig_q, status="pending_staff")
        db.add(q)
        db.commit()
        return {"question": orig_q, "answer": None, "status": "redirect", "matches": []}

    # Otherwise, persist answered response
    q = models.Query(student_id=user.id, question=orig_q, answer=answer, status="answered")
    db.add(q)
    db.commit()
    return {"question": orig_q, "answer": answer, "status": "answered", "matches": []}

@router.get("/student/history")
def history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	items = db.query(models.Query).filter(models.Query.student_id == user.id).order_by(models.Query.created_at.desc()).all()
	return [{"id": q.id, "question": q.question, "answer": q.answer, "status": q.status, "created_at": str(q.created_at)} for q in items]


@router.get("/faqs")
def public_faqs(db: Session = Depends(get_db)):
	# Public threshold: times_asked >= 3
	rows = db.query(models.FAQ).filter(models.FAQ.times_asked >= 3).order_by(models.FAQ.times_asked.desc()).all()
	return [{"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked} for f in rows]


@router.get("/student/faqs")
def public_faqs_scoped(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	# Same data, but under /api/student/faqs to avoid any potential path conflicts
	rows = db.query(models.FAQ).filter(models.FAQ.times_asked >= 3).order_by(models.FAQ.times_asked.desc()).all()
	return [{"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked} for f in rows]
