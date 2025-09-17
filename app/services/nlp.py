from typing import List
from langdetect import detect
from deep_translator import GoogleTranslator
import re
import os
from functools import lru_cache

# Optional OpenAI
try:
	from openai import OpenAI  # type: ignore
	_openai_available = True
except Exception:  # pragma: no cover
	OpenAI = None  # type: ignore
	_openai_available = False


def detect_language(text: str) -> str:
	try:
		return detect(text)
	except Exception:
		return "auto"


def translate(text: str, dest: str) -> str:
	if not text:
		return text
	try:
		return GoogleTranslator(source="auto", target=dest).translate(text)
	except Exception:
		return text

@lru_cache(maxsize=256)
def normalize_query(user_query: str) -> str:
    if not user_query:
        return user_query
    # If our embedding backend is multilingual, do NOT translate; use original text for cross-lingual semantic match.
    try:
        # Lazy import to avoid any potential circular dependency
        from .faiss_store import faiss_store  # type: ignore
        model_key = getattr(getattr(faiss_store, "backend", None), "model_key", "") or ""
        if isinstance(model_key, str):
            mk = model_key.lower()
            # OpenAI text-embedding-3-small and paraphrase-multilingual models are multilingual
            if mk.startswith("openai:") or "paraphrase-multilingual" in mk:
                return user_query
    except Exception:
        pass
    # Otherwise, normalize to English for better lexical alignment
    if not _openai_available or not os.getenv("OPENAI_API_KEY"):
        return translate(user_query, "en")
    try:
        client = OpenAI()
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role":"system","content":"Translate the query into clear English for search, without changing its meaning."},
                {"role":"user","content":user_query},
            ],
            temperature=0.0,
        )
        return resp.choices[0].message.content or user_query  # type: ignore
    except Exception:
        return translate(user_query, "en")


def openai_translate_to_en(text: str) -> str:
	# kept for backward compatibility, now calls normalize_query (cached)
	return normalize_query(text)


def openai_rephrase_in_lang(question_original: str, answer_raw: str, target_lang: str) -> str:
	if not answer_raw:
		return answer_raw
	# English target shortcut
	if target_lang.lower().startswith("en"):
		return concise_answer_from_context(question_original, answer_raw)
	if not _openai_available or not os.getenv("OPENAI_API_KEY"):
		# Fallback to simple machine translation if no OpenAI
		ans_en = concise_answer_from_context(question_original, answer_raw)
		try:
			return GoogleTranslator(source="auto", target=target_lang).translate(ans_en)
		except Exception:
			return ans_en
	try:
		client = OpenAI()
		prompt = (
			"Rephrase the answer below naturally and concisely in the SAME language as the user's question. "
			"Keep it factual and under 3 sentences."
		)
		content = f"User question: {question_original}\nAnswer: {answer_raw}"
		resp = client.chat.completions.create(
			model="gpt-4o-mini",
			messages=[
				{"role":"system","content":prompt},
				{"role":"user","content":content},
			],
			temperature=0.2,
		)
		return resp.choices[0].message.content or concise_answer_from_context(question_original, answer_raw)  # type: ignore
	except Exception:
		return concise_answer_from_context(question_original, answer_raw)


def improve_answer(original_query: str, raw_answer: str, target_lang: str) -> str:
	return openai_rephrase_in_lang(original_query, raw_answer, target_lang)


def _sentences(text: str) -> List[str]:
	parts = re.split(r"(?<=[.!?])\s+", text.strip())
	return [p.strip() for p in parts if p.strip()]


def concise_answer_from_context(question: str, context: str, max_sentences: int = 3, max_chars: int = 350) -> str:
	sents = _sentences(context)
	answer = " ".join(sents[:max_sentences]) if sents else context.strip()
	answer = re.sub(r"\s+", " ", answer).strip()
	if len(answer) > max_chars:
		answer = answer[:max_chars].rsplit(" ", 1)[0] + "..."
	return answer


def keyword_overlap(question: str, context: str) -> int:
	q_tokens = set(re.findall(r"[a-zA-Z]{3,}", question.lower()))
	c_tokens = set(re.findall(r"[a-zA-Z]{3,}", context.lower()))
	return len(q_tokens & c_tokens)


def generate_answer_with_context(question: str, contexts: List[str]) -> str:
	if not contexts:
		return "I'm not sure."
	best = contexts[0]
	return concise_answer_from_context(question, best)


# ---------------- domain-specific helpers ----------------
_FEE_CATEGORIES = [
    "OPEN",
    "EBC",
    "EBC-GIRLS",
    "SEBC",
    "SEBC-GIRLS",
    "EWS",
    "EWS-GIRLS",
    "EWS - GIRLS",
    "OBC",
    "OBC-GIRLS",
    "OBC - GIRLS",
    "SBC",
    "ST",
    "SC",
    "TFWS",
    "T.F.W.S.",
]


def _canon(s: str) -> str:
    # normalize: uppercase, remove spaces, dots
    return re.sub(r"[^a-z0-9]", "", s.lower())


def extract_fee_amount_from_context(user_query: str, context: str) -> str | None:
    """Try to extract the total fee amount for a category mentioned in the user query
    from a tabular text context extracted from PDF.

    Returns the amount string like "29,216" if found, else None.
    """
    if not user_query or not context:
        return None
    qn = _canon(user_query)
    # find which category is asked
    target: str | None = None
    for cat in _FEE_CATEGORIES:
        if _canon(cat) in qn:
            target = cat
            break
    if not target:
        return None
    target_key = _canon(target)
    # search line containing category in context
    lines = [ln.strip() for ln in context.splitlines() if ln.strip()]
    best_line = None
    for ln in lines:
        if target_key in _canon(ln):
            best_line = ln
            # prefer the first matching complete row
            break
    if not best_line:
        # sometimes the row is split; join window of lines around where category occurs
        blob = " ".join(lines)
        if target_key not in _canon(blob):
            return None
        best_line = blob
    # capture numbers with commas and choose the last one as Total Fees
    m = list(re.finditer(r"(?<!\d)(\d{1,3}(?:,\d{2,3})+)(?!\d)", best_line))
    if not m:
        return None
    amount = m[-1].group(1)
    return amount


def detect_fee_category(user_query: str) -> str | None:
    if not user_query:
        return None
    qn = _canon(user_query)
    for cat in _FEE_CATEGORIES:
        if _canon(cat) in qn:
            return cat
    return None
