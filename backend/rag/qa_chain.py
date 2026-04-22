"""
RAG Q&A Chain
Given a document and a question, retrieves relevant chunks and generates
a grounded answer using Google Gemini. The LLM is explicitly instructed
to only use the provided context (no hallucination).
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

from .processor import retrieve_relevant_chunks, get_document


SYSTEM_PROMPT = """You are a logistics domain expert and a precise document analyst.
You are answering a question strictly based on the provided document excerpts.

Rules you MUST follow:
1. ONLY use information found in the provided context below.
2. If the answer is not in the context, say: "The provided document does not contain information about this topic."
3. Do NOT add information from your general knowledge.
4. Cite the context by referring to "the document" when stating facts.
5. Be concise, structured, and professional.

Context from document "{document_title}":
---
{context}
---
"""

USER_PROMPT = "Question: {question}"


def answer_question(
    doc_id: str,
    question: str,
    model_name: str = "gemini-1.5-flash",
    top_k: int = 5,
) -> dict:
    """
    Full RAG Q&A pipeline:
    1. Retrieve top-k relevant chunks for the question
    2. Format them as context
    3. Ask Gemini to answer strictly within the context

    Returns:
        {
            "answer": str,
            "sources": list[str],  # the chunks used
            "chunk_count": int,
            "doc_title": str,
        }
    """
    # Get document metadata
    doc = get_document(doc_id)
    if not doc:
        raise ValueError(f"Document '{doc_id}' not found in knowledge base.")

    # Retrieve relevant chunks
    chunks = retrieve_relevant_chunks(doc_id, question, top_k=top_k)
    if not chunks:
        return {
            "answer": "No relevant content found in the document for this question.",
            "sources": [],
            "chunk_count": 0,
            "doc_title": doc["title"],
        }

    # Build context string
    context = "\n\n---\n\n".join(f"[Excerpt {i+1}]\n{chunk}" for i, chunk in enumerate(chunks))

    # Build LLM chain
    from agents.crew import SUPPORTED_MODELS
    resolved_model = SUPPORTED_MODELS.get(model_name, "gemini-flash-latest")
    
    api_key = os.getenv("GOOGLE_API_KEY", "")
    llm = ChatGoogleGenerativeAI(
        model=resolved_model,
        google_api_key=api_key,
        temperature=0.1,  # Low temperature for factual, grounded answers
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_PROMPT),
    ])

    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({
        "document_title": doc["title"],
        "context": context,
        "question": question,
    })

    return {
        "answer": answer,
        "sources": chunks,
        "chunk_count": len(chunks),
        "doc_title": doc["title"],
    }
