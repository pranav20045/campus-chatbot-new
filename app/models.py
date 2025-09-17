from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
	__tablename__ = "users"
	id = Column(Integer, primary_key=True, index=True)
	email = Column(String, unique=True, index=True, nullable=False)
	password_hash = Column(String, nullable=False)
	role = Column(String, nullable=False)  # admin, staff, student
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	queries = relationship("Query", back_populates="student", foreign_keys="Query.student_id")
	staff_answers = relationship("Query", back_populates="staff", foreign_keys="Query.staff_id")

class Document(Base):
	__tablename__ = "documents"
	id = Column(Integer, primary_key=True, index=True)
	title = Column(String, nullable=False)
	filename = Column(String, nullable=False)
	source_type = Column(String, default="pdf")
	uploaded_by = Column(Integer, ForeignKey("users.id"))
	uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
	qa_pairs = relationship("QAPair", back_populates="document", cascade="all, delete-orphan")

class QAPair(Base):
	__tablename__ = "qa_pairs"
	id = Column(Integer, primary_key=True, index=True)
	document_id = Column(Integer, ForeignKey("documents.id"), index=True)
	question = Column(Text, nullable=False)
	answer = Column(Text, nullable=False)
	language = Column(String, default="auto")
	embedding_id = Column(String, nullable=True)  # optional mapping to vector store
	document = relationship("Document", back_populates="qa_pairs")

class Query(Base):
	__tablename__ = "queries"
	id = Column(Integer, primary_key=True, index=True)
	student_id = Column(Integer, ForeignKey("users.id"))
	question = Column(Text, nullable=False)
	answer = Column(Text, nullable=True)
	status = Column(String, default="answered")  # answered, pending_staff, answered_by_staff
	language = Column(String, default="auto")
	staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	answered_at = Column(DateTime(timezone=True), nullable=True)
	student = relationship("User", foreign_keys=[student_id], back_populates="queries")
	staff = relationship("User", foreign_keys=[staff_id], back_populates="staff_answers")


class FAQ(Base):
	__tablename__ = "faqs"
	id = Column(Integer, primary_key=True, index=True)
	question = Column(String, nullable=False, unique=True)
	answer = Column(Text, nullable=False)
	times_asked = Column(Integer, default=1)