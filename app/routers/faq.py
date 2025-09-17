from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..auth import require_role, get_current_user

router = APIRouter(prefix="/api/student", tags=["faqs"])


@router.get("/faqs", response_model=List[dict])
def get_public_faqs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	rows = db.query(models.FAQ).filter(models.FAQ.times_asked >= 3).order_by(models.FAQ.times_asked.desc()).all()
	return [{"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked} for f in rows]


@router.post("/faqs", response_model=dict)
def upsert_faq(question: str, answer: str, db: Session = Depends(get_db), staff: models.User = Depends(require_role("staff"))):
	if not question or not answer:
		raise HTTPException(status_code=400, detail="Question and answer required")
	f = db.query(models.FAQ).filter(models.FAQ.question == question).first()
	if f:
		f.answer = answer
		f.times_asked = (f.times_asked or 0) + 1
	else:
		f = models.FAQ(question=question, answer=answer, times_asked=1)
		db.add(f)
	db.commit()
	return {"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked}


