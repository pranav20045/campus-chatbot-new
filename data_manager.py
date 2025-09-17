import os
import json
from datetime import datetime

LOG_DIR = os.path.join("storage", "logs")
LOG_FILE = os.path.join(LOG_DIR, "unanswered_questions.jsonl")

os.makedirs(LOG_DIR, exist_ok=True)

def log_unanswered_question(question: str) -> None:
    try:
        rec = {
            "question": question,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        # best-effort logging only
        pass
