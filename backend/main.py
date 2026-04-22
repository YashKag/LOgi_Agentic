import asyncio
import os
import shutil
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException, Request, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

# Load environment variables — explicit path so it works from any CWD
_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
_loaded = load_dotenv(dotenv_path=_ENV_PATH, override=False)
print(f"[Startup] .env loaded from: {_ENV_PATH} (found={_loaded})")
print(f"[Startup] GOOGLE_API_KEY = {'SET ✓' if (os.getenv('GOOGLE_API_KEY') and os.getenv('GOOGLE_API_KEY') != 'your_google_api_key_here') else 'MISSING ✗ — edit backend/.env'}")
print(f"[Startup] SERPER_API_KEY  = {'SET ✓' if (os.getenv('SERPER_API_KEY') and os.getenv('SERPER_API_KEY') != 'your_serper_api_key_here') else 'MISSING ✗ — edit backend/.env'}")

from knowledge.repository import (
    save_research,
    get_research,
    list_research,
    delete_research,
    search_research,
)
from agents.crew import run_research_crew, SUPPORTED_MODELS
from rag.processor import (
    ingest_document, list_documents, get_document, delete_document,
    UPLOADS_DIR,
)
from rag.qa_chain import answer_question

# Active task log store: task_id -> list of log messages
active_tasks: dict[str, list[str]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    yield
    active_tasks.clear()


app = FastAPI(
    title="Logistics Researcher Agent API",
    description="LLM-powered autonomous researcher for the logistics industry.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The research question")
    domain: str = Field(
        default="General Logistics",
        description="Logistics sub-domain context (e.g., 'Last-Mile Delivery', 'Cold Chain', 'Freight')"
    )
    depth: Literal["standard", "deep"] = Field(
        default="standard",
        description="'standard' uses web search; 'deep' adds a web scraper for full content"
    )
    model: str = Field(
        default="gemini-1.5-flash",
        description=f"LLM model to use. Options: {list(SUPPORTED_MODELS.keys())}"
    )

class QueryResponse(BaseModel):
    id: str


# ── Health Check — registered at BOTH paths for compatibility ────────────────

def _health_response():
    """Build the health status response."""
    google_key = os.getenv("GOOGLE_API_KEY", "")
    serper_key = os.getenv("SERPER_API_KEY", "")
    google_ok = bool(google_key and google_key != "your_google_api_key_here")
    serper_ok = bool(serper_key and serper_key != "your_serper_api_key_here")
    return {
        "status": "ok" if (google_ok and serper_ok) else "degraded",
        "api_keys": {
            "google_api_key": "set" if google_ok else "missing — edit backend/.env",
            "serper_api_key": "set" if serper_ok else "missing — edit backend/.env",
        },
        "supported_models": list(SUPPORTED_MODELS.keys()),
        "supported_depths": ["standard", "deep"],
        "active_tasks": len(active_tasks),
    }

@app.get("/health", tags=["System"])
def health_check_root():
    """Health check at root path (legacy)."""
    return _health_response()

@app.get("/api/health", tags=["System"])
def health_check():
    """Health check at /api path."""
    return _health_response()


# ── Research Endpoints ────────────────────────────────────────────────────────

@app.post("/api/research", response_model=QueryResponse, tags=["Research"])
async def start_research(req: QueryRequest):
    """Start a new autonomous research task. Returns a task ID for progress streaming."""
    import uuid
    task_id = str(uuid.uuid4())[:8]
    active_tasks[task_id] = []

    async def process_task(t_id: str, request: QueryRequest):
        def step_callback(msg: str):
            active_tasks[t_id].append(msg)

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: run_research_crew(
                    query=request.query,
                    step_callback=step_callback,
                    domain=request.domain,
                    depth=request.depth,
                    model_name=request.model,
                ),
            )
            save_research(
                query=request.query,
                result=result,
                agent_logs=active_tasks[t_id],
                domain=request.domain,
                model=request.model,
            )
        except Exception as e:
            error_msg = f"[ERROR] Task failed: {str(e)}"
            print(error_msg)
            active_tasks[t_id].append(error_msg)
        finally:
            active_tasks[t_id].append("[DONE]")

    asyncio.create_task(process_task(task_id, req))
    return {"id": task_id}


@app.get("/api/research/{task_id}/stream", tags=["Research"])
async def stream_research_progress(request: Request, task_id: str):
    """Stream real-time progress of an active research task via Server-Sent Events."""
    async def event_generator():
        last_index = 0
        while True:
            if await request.is_disconnected():
                break

            if task_id not in active_tasks:
                yield {"data": "Task not found or already completed."}
                break

            logs = active_tasks[task_id]
            while last_index < len(logs):
                msg = logs[last_index]
                yield {"data": msg}
                last_index += 1
                if msg == "[DONE]":
                    await asyncio.sleep(1)
                    active_tasks.pop(task_id, None)
                    return

            await asyncio.sleep(0.4)

    return EventSourceResponse(event_generator())


@app.get("/api/research", tags=["Research"])
def get_all_research():
    """List all saved research entries (lightweight summaries — no full result text)."""
    return list_research()


# NOTE: /search MUST be registered BEFORE /{entry_id} — otherwise FastAPI
# treats the literal string 'search' as a path parameter value.
@app.get("/api/research/search", tags=["Research"])
def search_all_research(q: str = Query(..., description="Keyword to search across queries and domains")):
    """Search saved research entries by keyword in query text or domain."""
    return search_research(q)


@app.get("/api/research/{entry_id}", tags=["Research"])
def get_single_research(entry_id: str):
    """Get a specific research result by ID (includes full result text and agent logs)."""
    result = get_research(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail="Research not found")
    return result


@app.delete("/api/research/{entry_id}", tags=["Research"])
def delete_research_endpoint(entry_id: str):
    """Permanently delete a research entry and its associated markdown file."""
    if delete_research(entry_id):
        return {"status": "deleted", "id": entry_id}
    raise HTTPException(status_code=404, detail="Research not found")


# ── RAG — Document Intelligence Endpoints ────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The question to ask about the document")
    model: str = Field(default="gemini-1.5-flash", description="LLM model for answer generation")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")


@app.post("/api/documents", tags=["RAG"])
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
):
    """
    Upload a PDF or TXT logistics document.
    The document is parsed, chunked, embedded, and stored in ChromaDB.
    """
    allowed_types = {"application/pdf", "text/plain"}
    allowed_extensions = {".pdf", ".txt"}
    suffix = Path(file.filename).suffix.lower()

    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and TXT files are supported. Got: {suffix}"
        )

    # Save the uploaded file temporarily
    safe_name = f"upload_{file.filename}"
    save_path = UPLOADS_DIR / safe_name
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        entry = ingest_document(
            file_path=str(save_path),
            filename=file.filename,
            title=title,
        )
        return entry
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents", tags=["RAG"])
def get_all_documents():
    """List all uploaded and processed documents."""
    return list_documents()


@app.get("/api/documents/{doc_id}", tags=["RAG"])
def get_single_document(doc_id: str):
    """Get metadata for a specific document."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.delete("/api/documents/{doc_id}", tags=["RAG"])
def remove_document(doc_id: str):
    """Delete a document and its vector embeddings from ChromaDB."""
    if delete_document(doc_id):
        return {"status": "deleted", "id": doc_id}
    raise HTTPException(status_code=404, detail="Document not found")


@app.post("/api/documents/{doc_id}/ask", tags=["RAG"])
async def ask_document(doc_id: str, req: AskRequest):
    """
    Ask a question about a specific document.
    The system retrieves the most relevant chunks and generates a grounded answer.
    The LLM is strictly instructed NOT to use general knowledge — only the document.
    """
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: answer_question(
                doc_id=doc_id,
                question=req.question,
                model_name=req.model,
                top_k=req.top_k,
            ),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dev entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

