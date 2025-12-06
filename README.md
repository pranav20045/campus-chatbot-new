Team Work ,
Asiya Attar – Implemented a FastAPI-based campus assistant with Retrieval-Augmented Generation (RAG). Documents are ingested into a persistent Chroma vector database, which I set up, and student questions are answered using Gemini with strict, context-grounded prompts.

Overview

Framework: FastAPI backend

Auth: Admin, Staff, Student roles

Ingestion: data_ingest.py builds a Chroma vector DB from PDFs under source_documents/ (vector DB implementation done by me)

Retrieval + Answering: ai_engine.py uses Chroma + Gemini (via google-generativeai)

Persistence: Vector DB stored in vector_db/

Unanswered logs: storage/logs/unanswered_questions.jsonl

# Campus Chatbot

A FastAPI-based campus assistant with Retrieval-Augmented Generation (RAG). Documents are ingested into a persistent Chroma vector database and student questions are answered using Gemini with strict, context-grounded prompts.

## Overview
- **Framework**: FastAPI backend
- **Auth**: Admin, Staff, Student roles
- **Ingestion**: `data_ingest.py` builds a Chroma DB from PDFs under `source_documents/`
- **Retrieval + Answering**: `ai_engine.py` uses Chroma + Gemini (via `google-generativeai`)
- **Persistence**: Vector DB in `vector_db/`
- **Unanswered logs**: `storage/logs/unanswered_questions.jsonl`

## Architecture
```
/ (project root)
├─ app/
│  ├─ main.py               # FastAPI app setup, routers
│  ├─ routers/
│  │  ├─ admin.py           # Admin upload + reindex + stats
│  │  ├─ student.py         # Student ask/history + /api/faqs
│  │  ├─ staff.py, faq.py   # Other routes (unchanged)
│  ├─ services/
│  │  ├─ semantic.py        # Legacy in-app semantic matcher for FAQs (unchanged)
│  │  ├─ qa_extractor.py    # Utility (not used by new pipeline)
│  ├─ database.py, models.py, auth.py, schemas.py, config.py
├─ data_ingest.py           # Build/refresh Chroma from PDFs in source_documents/
├─ ai_engine.py             # get_bot_response() -> Chroma retrieval + Gemini answer
├─ data_manager.py          # logs unanswered questions to storage/logs/
├─ source_documents/        # Place PDFs for ingestion
├─ vector_db/               # Chroma persistent store (auto-created)
├─ storage/
│  ├─ uploads/              # Admin-uploaded files
│  └─ logs/unanswered_questions.jsonl
├─ requirements.txt
├─ .env                     # GEMINI_API_KEY, OPENAI_API_KEY
└─ README.md
```

## Prerequisites
- Python 3.11 is recommended for best compatibility with scientific/AI packages on Windows.
- A recent pip: `python -m pip install --upgrade pip`

## Setup
1) Create and activate a virtual environment
```
py -3.11 -m venv .venv
. .venv/Scripts/Activate
```

2) Install dependencies
```
pip install -r requirements.txt
```

3) Environment variables
Create a `.env` file at the project root with the following keys:
```
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```
Ensure `.env` is listed in `.gitignore` (already present).

## Running the API
```
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Ingestion (Building the Vector DB)
There are two ways to ingest PDFs into the vector DB (`vector_db/`):

- **Admin Dashboard Upload**
  - POST `/api/admin/upload` with a PDF; it mirrors to `source_documents/` and automatically rebuilds the vector DB.
- **CLI**
  - Put PDFs into `source_documents/`
  - Run: `python data_ingest.py`

The ingestion pipeline uses:
- `langchain_community.document_loaders.PyPDFLoader`
- `RecursiveCharacterTextSplitter`
- `SentenceTransformerEmbeddings("paraphrase-multilingual-MiniLM-L12-v2")`
- `Chroma` persisted at `vector_db/`

Check vector DB stats:
- GET `/api/admin/faiss/stats` → `{ "vectors": <count>, "engine": "chroma" }`

## Retrieval + Answer Generation
- Student questions go to `POST /api/student/ask`.
- Internally calls `ai_engine.get_bot_response(question)`:
  - Uses Chroma similarity search to find the most relevant context
  - Builds a strict prompt and calls Gemini (`google-generativeai`)
  - If insufficient context, logs via `data_manager.log_unanswered_question()` and forwards to staff
- All answers and redirects are stored in `models.Query` and visible through `GET /api/student/history`.

## Key Endpoints
- `POST /api/auth/login` → returns JWT token
- `POST /api/admin/upload` → upload PDFs; mirrors to `source_documents/` and rebuilds vector DB
- `POST /api/admin/reindex` → rebuild vector DB from `source_documents/`
- `GET /api/admin/faiss/stats` → Chroma stats
- `POST /api/student/ask` → ask the bot; returns `answered` or `redirect`
- `GET /api/student/history` → student’s Q/A history
- `GET /api/faqs` and `GET /api/student/faqs` → frequently asked questions

## Troubleshooting
- **Python 3.13 build errors**: Some dependencies may not have wheels yet. Use Python 3.11.
- **GEMINI_API_KEY not detected**: Ensure `.env` is at project root (same folder as `requirements.txt`) and restart the server.
- **Empty results / redirects to staff**:
  - Ensure PDFs exist in `source_documents/` and ingestion ran successfully (`python data_ingest.py` or admin upload).
  - Confirm `/api/admin/faiss/stats` shows a positive vector count.
- **Model download delays**: First-time use of SentenceTransformer may take time to download. Wait and retry.

## Migration Notes
- Legacy FAISS/BM25 code paths were deprecated in favor of Chroma + Gemini. The following modules are no longer used:
  - `app/services/chunker.py`
  - `app/services/faiss_store.py`
  - `app/services/vector_store.py`
- They’ve been replaced with `data_ingest.py` (ingestion) and `ai_engine.py` (retrieval/answers).

## Security
- Never commit API keys. `.env` is ignored by Git via `.gitignore`.

## License
Add your license here (e.g., MIT).
