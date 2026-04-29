FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for ChromaDB and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure the database directory exists
RUN mkdir -p /app/rag/chroma_db /app/rag/uploads

EXPOSE 8000

# Run Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
