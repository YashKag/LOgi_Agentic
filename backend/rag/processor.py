"""
RAG Pipeline — Document Processor
Handles PDF/text ingestion, chunking, and embedding storage.

Pipeline:
  1. Parse PDF/TXT → raw text
  2. Split into overlapping chunks (RecursiveCharacterTextSplitter)
  3. Embed each chunk with Google text-embedding-004
  4. Store vectors in a local ChromaDB collection per document
"""

import os
import uuid
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

# PDF parsing
import fitz  # PyMuPDF

# LangChain text splitting
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Google embeddings via LangChain
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# ChromaDB as the local vector store
import chromadb
from chromadb.config import Settings


# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
CHROMA_DIR = BASE_DIR / "chroma_db"
META_FILE = BASE_DIR / "documents.json"

UPLOADS_DIR.mkdir(exist_ok=True)
CHROMA_DIR.mkdir(exist_ok=True)


# ── ChromaDB client (persistent) ───────────────────────────────────────────────
def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )


# ── Embeddings ─────────────────────────────────────────────────────────────────
def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key or api_key == "your_google_api_key_here":
        raise ValueError("GOOGLE_API_KEY must be set to use the RAG pipeline.")
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=api_key,
    )


# ── Metadata helpers ───────────────────────────────────────────────────────────
def _load_meta() -> list[dict]:
    if META_FILE.exists():
        try:
            return json.loads(META_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _save_meta(data: list[dict]):
    META_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_text(file_path: str, filename: str) -> str:
    """Extract raw text from a PDF or TXT file."""
    if filename.lower().endswith(".pdf"):
        doc = fitz.open(file_path)
        text = "\n\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    else:
        return Path(file_path).read_text(encoding="utf-8", errors="ignore")


def ingest_document(file_path: str, filename: str, title: Optional[str] = None) -> dict:
    """
    Full ingest pipeline:
    1. Extract text
    2. Split into chunks
    3. Embed and store in ChromaDB

    Returns the document metadata dict.
    """
    doc_id = str(uuid.uuid4())[:10]
    title = title or filename

    # Step 1: Extract
    raw_text = extract_text(file_path, filename)
    if not raw_text.strip():
        raise ValueError("Could not extract any text from the document.")

    # Step 2: Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    chunks = splitter.split_text(raw_text)

    # Step 3: Embed and store
    embeddings = get_embeddings()
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name=f"doc_{doc_id}",
        metadata={"hnsw:space": "cosine"},
    )

    # Batch embed (ChromaDB handles batching internally)
    chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "chunk_index": i, "source": filename} for i in range(len(chunks))]

    # Get raw embeddings from LangChain embeddings model
    embedded_vectors = embeddings.embed_documents(chunks)

    collection.add(
        ids=chunk_ids,
        embeddings=embedded_vectors,
        documents=chunks,
        metadatas=metadatas,
    )

    # Step 4: Save metadata
    entry = {
        "id": doc_id,
        "title": title,
        "filename": filename,
        "chunk_count": len(chunks),
        "char_count": len(raw_text),
        "created_at": datetime.now().isoformat(),
        "collection": f"doc_{doc_id}",
    }
    docs = _load_meta()
    docs.append(entry)
    _save_meta(docs)

    return entry


def list_documents() -> list[dict]:
    """Return all ingested document metadata."""
    return sorted(_load_meta(), key=lambda d: d.get("created_at", ""), reverse=True)


def get_document(doc_id: str) -> Optional[dict]:
    """Get a specific document's metadata."""
    return next((d for d in _load_meta() if d["id"] == doc_id), None)


def delete_document(doc_id: str) -> bool:
    """Delete document from ChromaDB and metadata."""
    docs = _load_meta()
    doc = next((d for d in docs if d["id"] == doc_id), None)
    if not doc:
        return False

    # Remove from ChromaDB
    try:
        client = get_chroma_client()
        client.delete_collection(doc["collection"])
    except Exception:
        pass

    # Remove file if it exists
    doc_file = UPLOADS_DIR / f"{doc_id}_{doc['filename']}"
    if doc_file.exists():
        doc_file.unlink()

    # Remove from metadata
    _save_meta([d for d in docs if d["id"] != doc_id])
    return True


def retrieve_relevant_chunks(doc_id: str, question: str, top_k: int = 5) -> list[str]:
    """
    Embed the question and retrieve the top-k most similar chunks from the document.
    """
    doc = get_document(doc_id)
    if not doc:
        raise ValueError(f"Document {doc_id} not found.")

    embeddings = get_embeddings()
    question_vector = embeddings.embed_query(question)

    client = get_chroma_client()
    collection = client.get_collection(doc["collection"])

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=min(top_k, doc["chunk_count"]),
        include=["documents", "distances"],
    )
    return results["documents"][0] if results["documents"] else []
