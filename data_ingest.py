# This script is the "librarian" of our project.
# It reads raw documents, processes them, and creates a searchable AI memory (Vector DB).
# You only need to run this script once, or whenever you add new documents.

import os
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader  # type: ignore
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import SentenceTransformerEmbeddings  # type: ignore
from langchain_community.vectorstores import Chroma  # type: ignore


# --- CONFIGURATION ---
SOURCE_DOCUMENTS_DIR = "source_documents"  # The folder where you will put your PDFs
VECTOR_DB_DIR = "vector_db"  # The folder where the AI memory will be stored


def build_vector_db():
    """
    This function builds the Vector Database from the documents in the source folder.
    """
    print("Starting data ingestion process...")

    os.makedirs(SOURCE_DOCUMENTS_DIR, exist_ok=True)
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)

    # 1. Load Documents
    # It will look for all .pdf files in the specified directory.
    loader = DirectoryLoader(SOURCE_DOCUMENTS_DIR, glob="*.pdf", loader_cls=PyPDFLoader)
    documents = loader.load()
    if not documents:
        print(f"❌ No PDF documents found in '{SOURCE_DOCUMENTS_DIR}' folder. Aborting.")
        return

    print(f"✅ Loaded {len(documents)} document(s).")

    # 2. Split Documents into Chunks
    # We split the documents into smaller pieces for better search results.
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = text_splitter.split_documents(documents)
    print(f"📄 Split documents into {len(texts)} chunks.")

    # 3. Create Embeddings
    # We use a powerful multilingual model to convert our text chunks into vectors.
    embeddings = SentenceTransformerEmbeddings(model_name="paraphrase-multilingual-MiniLM-L12-v2")

    # 4. Create and Persist the Vector DB
    # We use ChromaDB to store our vectors in a searchable format.
    # The 'persist_directory' tells Chroma to save the database to our folder.
    print("🧠 Creating and persisting Vector DB... (This may take a few moments)...")
    db = Chroma.from_documents(texts, embeddings, persist_directory=VECTOR_DB_DIR)
    # Ensure flush to disk
    try:
        db.persist()
    except Exception:
        pass

    print(f"✅ Successfully created Vector DB in '{VECTOR_DB_DIR}' folder.")
    print("--- Data Ingestion Complete ---")


if __name__ == "__main__":
    build_vector_db()
