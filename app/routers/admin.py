import os
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..auth import require_role
from ..database import get_db
from .. import models
import data_ingest

# Optional: Chroma stats helper
try:
    from langchain_community.embeddings import SentenceTransformerEmbeddings  # type: ignore
    from langchain_community.vectorstores import Chroma  # type: ignore
    _chroma_available = True
except Exception:  # pragma: no cover
    SentenceTransformerEmbeddings = None  # type: ignore
    Chroma = None  # type: ignore
    _chroma_available = False

# No paraphrases needed in chunk-based ingestion

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/documents", response_model=List[dict])
def list_documents(db: Session = Depends(get_db), _: models.User = Depends(require_role("admin"))):
	docs = db.query(models.Document).all()
	return [{"id": d.id, "title": d.title, "filename": d.filename, "source_type": d.source_type} for d in docs]


def basic_paraphrases(q: str) -> List[str]:
    return []


def ai_paraphrases(q: str, limit: int = 5) -> List[str]:
    return []

@router.post("/upload")
async def upload_pdf(
	file: UploadFile = File(...),
	db: Session = Depends(get_db),
	admin: models.User = Depends(require_role("admin"))
):
	name = file.filename.lower()
	if not (name.endswith('.pdf') or name.endswith('.docx') or name.endswith('.txt')):
		raise HTTPException(status_code=400, detail="Only PDF/DOCX/TXT supported")
	storage_dir = os.path.join("storage", "uploads")
	os.makedirs(storage_dir, exist_ok=True)
	file_path = os.path.join(storage_dir, file.filename)
	with open(file_path, "wb") as f:
		f.write(await file.read())

	source_type = 'pdf' if name.endswith('.pdf') else ('docx' if name.endswith('.docx') else 'txt')
	doc = models.Document(title=file.filename, filename=file_path, source_type=source_type, uploaded_by=admin.id)
	db.add(doc)
	db.commit()
	db.refresh(doc)

	# New ingestion pipeline (Chroma): copy PDFs into source_documents/ and rebuild vector DB
	src_dir = os.path.join("source_documents")
	os.makedirs(src_dir, exist_ok=True)
	try:
		# Copy/mirror the uploaded file into source_documents only if it's a PDF (as data_ingest processes PDFs)
		if name.endswith('.pdf'):
			mirror_path = os.path.join(src_dir, file.filename)
			# If same name exists, overwrite to keep latest
			with open(mirror_path, "wb") as mf, open(file_path, "rb") as rf:
				mf.write(rf.read())
			# Rebuild the Chroma DB from all PDFs in source_documents/
			data_ingest.build_vector_db()
	except Exception as e:
		# Do not fail the upload if ingestion fails; admin can reindex later
		print(f"[admin.upload] Warning: ingestion failed: {e}")

	return {"document_id": doc.id, "status": "uploaded", "ingestion": "scheduled"}


@router.post("/reindex")
def reindex_all(db: Session = Depends(get_db), _: models.User = Depends(require_role("admin"))):
	"""Rebuild the Chroma Vector DB from source_documents/ PDFs."""
	try:
		data_ingest.build_vector_db()
		return {"status": "ok"}
	except Exception as e:
		return {"status": "error", "detail": str(e)}


@router.get("/faiss/stats")
def faiss_stats(_: models.User = Depends(require_role("admin"))):
	# Backward-compatible path but now returns Chroma stats
	if not _chroma_available:
		return {"vectors": 0, "engine": "chroma", "detail": "Chroma not available"}
	try:
		emb = SentenceTransformerEmbeddings(model_name="paraphrase-multilingual-MiniLM-L12-v2") if SentenceTransformerEmbeddings else None
		db = Chroma(persist_directory="vector_db", embedding_function=emb) if Chroma else None
		count = 0
		if db is not None and hasattr(db, "_collection") and db._collection is not None:
			count = db._collection.count()
		return {"vectors": int(count), "engine": "chroma"}
	except Exception as e:
		return {"vectors": 0, "engine": "chroma", "detail": str(e)}
