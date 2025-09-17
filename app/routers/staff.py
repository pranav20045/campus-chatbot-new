from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..auth import require_role
from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/staff", tags=["staff"])

@router.get("/pending", response_model=List[dict])
def list_pending(db: Session = Depends(get_db), _: models.User = Depends(require_role("staff"))):
	items = db.query(models.Query).filter(models.Query.status == "pending_staff").order_by(desc(models.Query.created_at)).all()
	return [{"id": q.id, "student_id": q.student_id, "question": q.question, "created_at": str(q.created_at)} for q in items]

from pydantic import BaseModel
class StaffAnswerIn(BaseModel):
	answer: str

@router.post("/answer_json/{query_id}")
def submit_answer_json(query_id: int, body: StaffAnswerIn, db: Session = Depends(get_db), staff: models.User = Depends(require_role("staff"))):
	q = db.query(models.Query).filter(models.Query.id == query_id).first()
	if not q:
		raise HTTPException(status_code=404, detail="Query not found")
	if q.status != "pending_staff":
		raise HTTPException(status_code=400, detail="Not pending")
	q.answer = body.answer
	q.status = "answered_by_staff"
	q.staff_id = staff.id
	# Upsert into FAQ and increment times_asked
	f = db.query(models.FAQ).filter(models.FAQ.question == q.question).first()
	if f:
		f.answer = body.answer  # keep latest authoritative answer
		f.times_asked = (f.times_asked or 0) + 1
	else:
		f = models.FAQ(question=q.question, answer=body.answer, times_asked=1)
		db.add(f)
	db.commit()
	return {"ok": True}


@router.get("/faqs", response_model=List[dict])
def list_faqs(db: Session = Depends(get_db), _: models.User = Depends(require_role("staff"))):
	rows = db.query(models.FAQ).order_by(desc(models.FAQ.times_asked)).all()
	return [{"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked} for f in rows]


@router.post("/faqs")
def upsert_faq(body: StaffAnswerIn, question: str, db: Session = Depends(get_db), _: models.User = Depends(require_role("staff"))):
	f = db.query(models.FAQ).filter(models.FAQ.question == question).first()
	if f:
		f.answer = body.answer
		f.times_asked = (f.times_asked or 0) + 1
	else:
		f = models.FAQ(question=question, answer=body.answer, times_asked=1)
		db.add(f)
	db.commit()
	return {"id": f.id, "question": f.question, "answer": f.answer, "times_asked": f.times_asked}
