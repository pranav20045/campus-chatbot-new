from pydantic import BaseModel, EmailStr
from typing import Optional, List

class Token(BaseModel):
	access_token: str
	token_type: str = "bearer"
	role: str

class UserLogin(BaseModel):
	email: EmailStr
	password: str

class UserOut(BaseModel):
	id: int
	email: EmailStr
	role: str
	class Config:
		from_attributes = True

class DocumentOut(BaseModel):
	id: int
	title: str
	filename: str
	source_type: str
	class Config:
		from_attributes = True

class QAPairOut(BaseModel):
	id: int
	question: str
	answer: str
	language: str
	class Config:
		from_attributes = True

class QueryCreate(BaseModel):
	question: str
	language: Optional[str] = None

class QueryOut(BaseModel):
	id: int
	student_id: int
	question: str
	answer: Optional[str]
	status: str
	language: str
	staff_id: Optional[int]
	class Config:
		from_attributes = True

class StaffAnswerIn(BaseModel):
	answer: str
