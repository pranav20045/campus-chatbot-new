from typing import List, Tuple
from pdfminer.high_level import extract_text as pdf_extract_text
from docx import Document as DocxDocument
import re
import os

# Optional OpenAI
try:
	from openai import OpenAI  # type: ignore
	_openai_available = True
except Exception:  # pragma: no cover
	OpenAI = None  # type: ignore
	_openai_available = False


def _extract_text_from_pdf(path: str) -> str:
	return pdf_extract_text(path)


def _extract_text_from_docx(path: str) -> str:
	doc = DocxDocument(path)
	return "\n".join(p.text for p in doc.paragraphs)


def _extract_text_from_txt(path: str) -> str:
	with open(path, "r", encoding="utf-8", errors="ignore") as f:
		return f.read()


def extract_text_any(path: str) -> str:
	t = ""
	pl = path.lower()
	if pl.endswith(".pdf"):
		t = _extract_text_from_pdf(path)
	elif pl.endswith(".docx"):
		t = _extract_text_from_docx(path)
	else:
		t = _extract_text_from_txt(path)
	return re.sub(r"\s+", " ", t).strip()


# Regex baseline (kept for fallback)
Q_PATTERNS = [
	r"^\s*(Q[:\-)\.]\s*)?(?P<q>[^\n\r\?]{5,}\?)\s*$",
	r"^\s*(Question\s*\d*[:\-)\.]\s*)(?P<q>.+?\?)\s*$",
]
A_PREFIX = re.compile(r"^\s*(A[:\-)\.]|Answer[:\-)\.]?)\s*", re.IGNORECASE)


def _iter_lines(text: str) -> List[str]:
	return [ln.rstrip() for ln in text.splitlines()]


def _is_question(line: str) -> str | None:
	for pat in Q_PATTERNS:
		m = re.match(pat, line, flags=re.IGNORECASE)
		if m:
			return m.group("q").strip()
	return None


def _clean_answer_lines(lines: List[str]) -> str:
	answer = []
	for ln in lines:
		if _is_question(ln):
			break
		if re.match(r"^\s*(-{3,}|_{3,}|\*{3,})\s*$", ln):
			break
		ln = A_PREFIX.sub("", ln)
		answer.append(ln)
	ans = " ".join(answer).strip()
	ans = re.sub(r"\s+", " ", ans)
	if len(ans) > 600:
		ans = ans[:600].rsplit(" ", 1)[0] + "..."
	return ans


def regex_qa(text: str) -> List[Tuple[str, str]]:
	lines = _iter_lines(text)
	qas: List[Tuple[str, str]] = []
	idx = 0
	while idx < len(lines):
		q = _is_question(lines[idx])
		if q:
			idx += 1
			ans_lines: List[str] = []
			while idx < len(lines) and not _is_question(lines[idx]):
				ans_lines.append(lines[idx])
				idx += 1
			answer = _clean_answer_lines(ans_lines)
			if answer:
				qas.append((q, answer))
			continue
		idx += 1
	return qas


def fallback_paragraph_qas(text: str, max_pairs: int = 20) -> List[Tuple[str, str]]:
	paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
	pairs: List[Tuple[str,str]] = []
	for p in paras:
		first = p.split(".",1)[0][:160].strip()
		if not first:
			continue
		q = first
		if not q.endswith("?"):
			q = f"What about: {q}?"
		pairs.append((q, p[:800]))
		if len(pairs) >= max_pairs:
			break
	return pairs


def ai_generate_qa(text: str, max_pairs: int = 30) -> List[Tuple[str, str]]:
	if not _openai_available or not os.getenv("OPENAI_API_KEY"):
		return []
	try:
		client = OpenAI()
		prompt = (
			"Extract diverse, concise campus FAQ question-answer pairs from the content. "
			"Return JSON array of objects with 'question' and 'answer'. Limit to " + str(max_pairs)
		)
		content = text[:12000]
		resp = client.chat.completions.create(
			model="gpt-4o-mini",
			messages=[
				{"role":"system","content":prompt},
				{"role":"user","content":content},
			],
			temperature=0.2,
		)
		import json
		data = json.loads(resp.choices[0].message.content)  # type: ignore
		pairs = []
		for obj in data:
			q = str(obj.get("question",""))[:300].strip()
			a = str(obj.get("answer",""))[:1000].strip()
			if q and a:
				pairs.append((q,a))
		return pairs
	except Exception:
		# Any API/network/parse error should silently fall back
		return []


def extract_qa_from_file(path: str) -> List[Tuple[str, str]]:
	text = extract_text_any(path)
	pairs = ai_generate_qa(text)
	if not pairs:
		pairs = regex_qa(text)
	if not pairs:
		pairs = fallback_paragraph_qas(text)
	# Augment with fee-table QAs if present
	fee_qas = extract_fee_table_qas(text)
	if fee_qas:
		pairs.extend(fee_qas)
	# deduplicate by normalized question
	seen = set()
	unique: List[Tuple[str,str]] = []
	for q,a in pairs:
		key = re.sub(r"\s+"," ", q.lower()).strip()
		if key in seen:
			continue
		seen.add(key)
		unique.append((q,a))
	return unique


# ---------------- Fee Table Parsing ----------------
_FEE_CATS = [
    "OPEN",
    "EBC",
    "EBC-GIRLS",
    "SEBC",
    "SEBC-GIRLS",
    "EWS",
    "EWS - GIRLS",
    "EWS-GIRLS",
    "OBC",
    "OBC - GIRLS",
    "OBC-GIRLS",
    "SBC",
    "ST",
    "SC",
    "T.F.W.S.",
    "TFWS",
]

def _canon(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())

def _numbers_in(s: str) -> List[str]:
    return [m.group(1) for m in re.finditer(r"(?<!\d)(\d{1,3}(?:,\d{2,3})+)(?!\d)", s)]

def extract_fee_table_qas(text: str) -> List[Tuple[str, str]]:
    """If the document appears to contain a fees table (Category, Total Fees etc.),
    generate clean Q&A pairs like:
      Q: What is the total fees amount for EBC-GIRLS?
      A: 29,216
    The heuristic: find lines containing known categories and take the last comma-number as total.
    """
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return []
    # quick gate: table-like headers
    header_blob = " ".join(lines[:80]).lower()
    if not ("category" in header_blob and ("total fees" in header_blob or "fees" in header_blob)):
        # not obviously a fee table
        pass
    cat_keys = {_canon(c): c for c in _FEE_CATS}
    out: List[Tuple[str,str]] = []
    for ln in lines:
        lc = _canon(ln)
        hit = None
        for k, orig in cat_keys.items():
            if k and k in lc:
                hit = orig
                break
        if not hit:
            continue
        nums = _numbers_in(ln)
        if not nums:
            # sometimes the row is broken; look ahead 2 lines
            idx = lines.index(ln)
            window = " ".join(lines[idx:idx+3])
            nums = _numbers_in(window)
        if not nums:
            continue
        total = nums[-1]
        q = f"What is the total fees amount for {hit}?"
        a = total
        out.append((q, a))
    return out
