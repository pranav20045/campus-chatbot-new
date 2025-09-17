import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from . import models
from .auth import get_password_hash
from .routers import admin as admin_router
from .routers import staff as staff_router
from .routers import student as student_router
from .routers import faq as faq_router
from .services.semantic import semantic_matcher

app = FastAPI(title="Campus Chatbot")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def seed_users():
	with next(get_db()) as db:  # type: ignore
		if not db.query(models.User).filter(models.User.email == "admin@campus.local").first():
			db.add(models.User(email="admin@campus.local", password_hash=get_password_hash("admin123"), role="admin"))
		if not db.query(models.User).filter(models.User.email == "staff@campus.local").first():
			db.add(models.User(email="staff@campus.local", password_hash=get_password_hash("staff123"), role="staff"))
		if not db.query(models.User).filter(models.User.email == "student@campus.local").first():
			db.add(models.User(email="student@campus.local", password_hash=get_password_hash("student123"), role="student"))
		db.commit()
		semantic_matcher.refresh(db)

app.include_router(student_router.router)
app.include_router(admin_router.router)
app.include_router(staff_router.router)
app.include_router(faq_router.router)

# Public FAQs endpoint (stable path)
@app.get("/api/faqs")
def get_public_faqs(db: Session = Depends(get_db)):
	rows = db.query(models.FAQ).filter(models.FAQ.times_asked >= 3).order_by(models.FAQ.times_asked.desc()).all()
	return [{"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked} for f in rows]

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
