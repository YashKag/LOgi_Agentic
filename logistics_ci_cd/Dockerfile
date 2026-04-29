# Multi-stage build for optimized production image
FROM python:3.12-slim as builder

# Install build dependencies
WORKDIR /build
COPY app/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt


# Production stage
FROM python:3.12-slim

# Add labels for metadata
LABEL maintainer="logistics-team"
LABEL version="2.0"
LABEL description="Python Logistics Application with CI/CD"

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY app/ .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Add local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')" || exit 1

# Use gunicorn for production (more robust than Flask dev server)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "60", "app:app"]