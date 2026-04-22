# LogiResearch — Logistics Intelligence Platform

LogiResearch is a full-stack, AI-powered platform designed to perform autonomous research and document analysis specifically tailored for the logistics and supply chain industry. It leverages modern agentic AI frameworks to synthesize complex queries into comprehensive, actionable reports.

---

## 🛠 Tech Stack

**Frontend:**
- **React.js (Vite)**: High-performance, highly responsive client.
- **Tailwind CSS**: Custom premium styling engine (Zinc, Violet, Emerald palettes).
- **Lucide Icons**: Clean, scalable vector iconography.

**Backend & AI:**
- **FastAPI (Python)**: High-performance async API backend.
- **CrewAI**: Autonomous multi-agent orchestration.
- **LangChain & ChromaDB**: Document chunking, embeddings, and vector retrieval (RAG).
- **LiteLLM**: Standardized routing to support Google Gemini models (`gemini-1.5-flash`, `gemini-2.0-flash`, etc.).
- **PyMuPDF**: Fast and reliable PDF parsing.

---

## 🚀 Setup Instructions

1. **Clone & Install Dependencies**
   - **Frontend**: Navigate to `frontend/` and run `npm install`.
   - **Backend**: Navigate to `backend/` and install requirements (e.g., `pip install -r requirements.txt`).

2. **Environment Variables**
   - In the `backend/` directory, create a `.env` file.
   - Add your keys:
     ```env
     GEMINI_API_KEY=your_google_api_key
     SERPER_API_KEY=your_serper_api_key
     ```

3. **Running the Application**
   - **Backend**: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Frontend**: `npm run dev`

---

## 🎓 Developer Interview Q&A Guide

*Use the following questions and answers to prepare for your project presentation or technical interview.*

### 1. What was your main motivation for building LogiResearch?
**Answer:** "The logistics industry relies on massive amounts of scattered data, complex regulations, and dense documents. I wanted to build a system that doesn't just act as a standard chatbot, but instead acts as a team of analysts. By using AI orchestration, the system can autonomously plan a research strategy, search the web, analyze the data, and synthesize a polished report without requiring constant human hand-holding."

### 2. Can you explain the architecture of your autonomous research workflow?
**Answer:** "When a user submits a query, it hits my FastAPI backend where a CrewAI process is instantiated. I've designed a specialized multi-agent crew:
1. **Planning**: Breaks down the broad query into specific search queries.
2. **Data Collection**: Executes targeted searches using the Serper API.
3. **Analysis**: Filters the noise and extracts the most relevant logistics insights.
4. **Synthesis**: Compiles the findings into a structured Markdown document. 
The backend then streams these process logs via Server-Sent Events (SSE) back to the React frontend in real-time."

### 3. How did you implement the Document Intelligence (RAG) feature?
**Answer:** "RAG stands for Retrieval-Augmented Generation. When a user uploads a PDF, the backend uses PyMuPDF to extract the text, and LangChain to split it into smaller overlapping chunks. These chunks are embedded and stored in a local ChromaDB vector database. When a user asks a question, the system queries the database for the most mathematically similar chunks of text, and feeds *only* that specific context to the Gemini LLM to generate a factual answer."

### 4. How do you prevent the AI from "hallucinating" or making up fake data?
**Answer:** "For the Document Q&A system, I prevent hallucinations through strict prompt engineering. The LLM is explicitly instructed to *only* use the retrieved context chunks from the vector database to answer the user's question, and to state if the answer isn't present in the document. For the Autonomous Research side, the agents rely on live web-search data (via Serper) rather than relying solely on the LLM's pre-trained memory."

### 5. Why did you choose CrewAI instead of just making sequential API calls to Gemini?
**Answer:** "Sequential API calls are rigid. CrewAI allows me to assign distinct personas, goals, and tools to individual agents. The 'Researcher' agent is specifically given web-search tools, whereas the 'Synthesizer' agent is explicitly instructed on formatting. CrewAI handles the complex logic of passing outputs between these agents and allowing them to iteratively reason, which mimics how a real human team would approach a problem."

### 6. What was the biggest technical challenge you faced, and how did you overcome it?
**Answer:** "One major challenge was stabilizing the LiteLLM and VertexAI integration. Initially, there were model mapping issues and API authentication errors (`404 Not Found` and `429 RateLimit`). I solved this by implementing a robust mapping layer that translates our frontend selection into valid Google AI Studio identifiers (like `gemini-1.5-flash`), explicitly configuring the OS environment variables right before CrewAI initializes, and ensuring the `.env` file logic dynamically adapts to our execution path."

### 7. Why did you choose Vite, React, and Tailwind for the front end?
**Answer:** "Vite provides incredibly fast Hot Module Replacement, speeding up my development process. React's component-based architecture allowed me to isolate complex logic like the real-time Server-Sent Event (SSE) streams in the dashboard. I opted for Tailwind CSS with completely custom colors (Zinc, Violet, Emerald) to avoid the 'generic student project' look, giving the application a premium, polished enterprise feel."
