from __future__ import annotations

import threading
from typing import List, Tuple, Optional
import numpy as np
from sqlalchemy.orm import Session

from .. import models

# Optional heavy import
try:
	from sentence_transformers import SentenceTransformer  # type: ignore
	_ST_AVAILABLE = True
except Exception:  # pragma: no cover
	SentenceTransformer = None  # type: ignore
	_ST_AVAILABLE = False

try:
	from rapidfuzz import fuzz  # type: ignore
except Exception:  # pragma: no cover
	fuzz = None  # type: ignore


class SemanticMatcher:
	def __init__(self, model_name: str = "sentence-transformers/paraphrase-MiniLM-L3-v2"):
		self.model_name = model_name
		self._model = None
		self._questions: List[str] = []
		self._answers: List[str] = []
		self._qa_ids: List[int] = []
		self._embeddings: Optional[np.ndarray] = None
		self._lock = threading.Lock()

	def _ensure_model(self):
		if not _ST_AVAILABLE:
			return None
		if self._model is None:
			self._model = SentenceTransformer(self.model_name)
		return self._model

	def refresh(self, db: Session) -> None:
		with self._lock:
			pairs = db.query(models.QAPair).all()
			self._questions = [p.question for p in pairs]
			self._answers = [p.answer for p in pairs]
			self._qa_ids = [p.id for p in pairs]
			self._embeddings = None
			if _ST_AVAILABLE and self._questions:
				model = self._ensure_model()
				emb = model.encode(self._questions, convert_to_numpy=True, normalize_embeddings=True)
				self._embeddings = emb.astype("float32")

	def most_similar(self, query: str) -> Tuple[float, Optional[Tuple[int, str, str]], str]:
		"""Returns (score, (qa_id, question, answer) | None, method) where method in {'emb','fuzz'}."""
		with self._lock:
			if not self._questions:
				return 0.0, None, "none"
			if self._embeddings is not None and _ST_AVAILABLE:
				model = self._ensure_model()
				qv = model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
				scores = (qv @ self._embeddings.T)[0]
				idx = int(np.argmax(scores))
				return float(scores[idx]), (self._qa_ids[idx], self._questions[idx], self._answers[idx]), "emb"
			# Fallback: RapidFuzz similarity on text
			if fuzz is None:
				return 0.0, None, "none"
			sims = []
			for q in self._questions:
				# Blend token_set and partial ratio to better handle paraphrases
				set_sim = fuzz.token_set_ratio(query, q)/100.0
				partial = fuzz.partial_ratio(query, q)/100.0
				sims.append(0.7*set_sim + 0.3*partial)
			idx = int(np.argmax(sims))
			return float(sims[idx]), (self._qa_ids[idx], self._questions[idx], self._answers[idx]), "fuzz"


semantic_matcher = SemanticMatcher()
