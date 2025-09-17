# This is the upgraded "brain" for your project for Phase 3.
# It uses the powerful Vector DB and now logs unanswered questions.

import os
import google.generativeai as genai
from dotenv import load_dotenv
try:
    from langchain.embeddings import SentenceTransformerEmbeddings  # type: ignore
except Exception:  # pragma: no cover
    # Newer LC versions moved integrations to langchain-community
    from langchain_community.embeddings import SentenceTransformerEmbeddings  # type: ignore
try:
    from langchain.vectorstores import Chroma  # type: ignore
except Exception:  # pragma: no cover
    from langchain_community.vectorstores import Chroma  # type: ignore
import data_manager  # NEW: Import the data_manager to log questions

# --- CONFIGURATION ---
load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

VECTOR_DB_DIR = "vector_db"

# --- LOAD THE AI MEMORY (VECTOR DATABASE) ---
print("🧠 Loading AI memory (Vector DB)...")
os.makedirs(VECTOR_DB_DIR, exist_ok=True)
embeddings = SentenceTransformerEmbeddings(model_name="paraphrase-multilingual-MiniLM-L12-v2")
db = Chroma(persist_directory=VECTOR_DB_DIR, embedding_function=embeddings)
print("✅ AI memory loaded successfully.")

# --- AI CORE LOGIC (THE REAL RAG ENGINE) ---

def get_bot_response(user_question: str) -> str:
    """
    This is the main function that generates a response from the AI.
    It now logs questions that it cannot answer.
    """
    if not GEMINI_API_KEY:
        # Don't crash the app; respond gracefully and log
        data_manager.log_unanswered_question(user_question)
        return (
            "The AI generation API is not configured (missing GEMINI_API_KEY). "
            "Your question has been forwarded to the administration."
        )
    try:
        print(f"🔍 Performing semantic search for: '{user_question}'")
        relevant_docs = db.similarity_search(user_question, k=1)  # Find the top 1 most relevant chunk
    except Exception as e:
        print(f"❌ Error searching Vector DB: {e}")
        return "Sorry, I'm having trouble connecting to my AI brain at the moment. Please try again later."

    # If no relevant documents are found, LOG the question and provide a helpful message.
    if not relevant_docs:
        print(f"⚠️ No relevant documents found for '{user_question}'. Logging it.")
        data_manager.log_unanswered_question(user_question)  # Log the question
        return (
            "I could not find an answer to that in my knowledge base. "
            "Your question has been forwarded to the administration, who will update my knowledge soon."
        )

    context = relevant_docs[0].page_content
    print(f"📚 Found relevant context:\n---\n{context}\n---")

    # Step 2: Augmentation (Create the "Safe" Prompt for Gemini)
    prompt = f"""
    You are Campus Connect AI, a helpful and polite college assistant.
    A student has asked the following question: "{user_question}"

    Use ONLY the following official information to answer the question. Do not use any other knowledge.
    If the provided information is not sufficient, you must say "I'm sorry, I don't have enough information to answer that question."

    Official Information: 
    ---
    {context}
    ---

    Your Answer (be conversational, helpful, and respond in the same language the student used):
    """

    # Step 3: Generation (Call the Gemini API)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)

        # Another check: if Gemini itself can't answer from the context, log it.
        if response and hasattr(response, 'text') and response.text and "I don't have enough information" in response.text:
            print(f"⚠️ Gemini could not answer '{user_question}' from context. Logging it.")
            data_manager.log_unanswered_question(user_question)
            return (
                "I could not find a specific answer to that in my knowledge base. "
                "Your question has been forwarded to the administration, who will update my knowledge soon."
            )

        return (response.text if response and hasattr(response, 'text') and response.text else "") or (
            "I could not find a specific answer to that in my knowledge base. "
            "Your question has been forwarded to the administration, who will update my knowledge soon."
        )
    except Exception as e:
        print(f"❌ Error calling Gemini API: {e}")
        return "Sorry, I'm having trouble connecting to my AI brain at the moment. Please try again later."
