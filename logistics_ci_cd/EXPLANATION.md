# 📘 Project Explanation — LogiFlow Logistics CI/CD App

This document explains every component of this project in detail — what each file does, why it exists, and how everything connects together.

---

## 📁 Project Structure Overview

```
logistics-ci-cd/
├── app/
│   ├── app.py               ← Flask application (backend + API)
│   ├── config.py            ← Configuration settings
│   ├── requirements.txt     ← Python dependencies
│   ├── test_app.py          ← Unit tests
│   ├── templates/
│   │   └── index.html       ← Web dashboard UI (frontend)
│   └── static/
│       └── style.css        ← Dashboard styling
├── .github/
│   └── workflows/
│       ├── ci.yml           ← CI pipeline (auto-run tests on every push)
│       └── cd.yml           ← CD pipeline (build Docker image + deploy to EC2)
├── Dockerfile               ← Instructions to build the Docker image
├── docker-compose.yml       ← Run the app with Docker Compose locally
├── ec2-setup.sh             ← One-time setup script for EC2 (installs Docker)
├── ec2-deploy.sh            ← Deploy/restart the app on EC2
├── pytest.ini               ← Pytest configuration
├── .flake8                  ← Python linting rules
└── .dockerignore            ← Files to exclude from Docker builds
```

---

## 🐍 1. `app/app.py` — The Flask Application

**What it is:** The heart of the project. A Python Flask web application that serves the dashboard UI and exposes a REST API for logistics operations.

**Key routes:**

| Route | Method | What it does |
|-------|--------|-------------|
| `/` | GET | Serves the web dashboard (HTML page) |
| `/health` | GET | Health check — returns `{"status": "UP"}` |
| `/api` | GET | Returns JSON service info |
| `/shipment` | POST | Creates a new shipment |
| `/shipment/<id>` | GET | Gets shipment details by ID |
| `/shipment/<id>/location` | PUT | Updates a shipment's current location |
| `/shipments` | GET | Lists all shipments (with optional status filter) |
| `/order` | POST | Creates a new order |
| `/order/<id>` | GET | Gets order details by ID |
| `/inventory` | GET | Lists all inventory items |
| `/inventory` | POST | Adds a new inventory item |
| `/inventory/<id>` | GET | Gets a specific inventory item |
| `/inventory/<id>/stock` | PUT | Updates stock quantity |
| `/route/optimize` | POST | Calculates an optimized delivery route |

**Why in-memory storage?** The app uses Python dictionaries (`shipments = {}`, `orders = {}`, `inventory = {}`) to store data. This is fine for demonstration — in a real production system, you'd swap this for a proper database like PostgreSQL or MongoDB.

**Why Gunicorn?** In production (inside Docker), the app is run with **Gunicorn** (a production-grade WSGI server) with 4 workers instead of Flask's built-in dev server. Gunicorn handles multiple requests at once and is far more stable.

---

## 🌐 2. `app/templates/index.html` — The Web Dashboard

**What it is:** A single-page HTML dashboard that provides a visual interface to interact with all the Flask API endpoints. No React or external framework — just pure HTML, CSS, and JavaScript using `fetch()` to talk to the backend.

**5 Tabs in the Dashboard:**

1. **📊 Dashboard** — Live stats (shipment count, inventory count), recent shipments, and quick action buttons
2. **📦 Shipments** — Create new shipments and track them by ID; view all shipments in a table
3. **🏭 Inventory** — Add inventory items and look them up; view all items (low stock highlighted in red)
4. **🛒 Orders** — Create orders with items and customer names; track order status
5. **🗺️ Route Optimizer** — Enter a start, waypoints, and end location to get an optimized route with estimated time

**How the UI talks to the backend:**
The JavaScript inside `index.html` makes `fetch()` API calls to the Flask routes (e.g., `fetch('/shipments')`) and dynamically renders the results as tables and cards.

---

## 🎨 3. `app/static/style.css` — Dashboard Styling

**What it is:** The CSS file that makes the dashboard look premium. Key design choices:

- **Dark mode** with a `#0f172a` (deep navy) background
- **Sidebar navigation** with active tab highlighting
- **Gradient accent** colors (indigo → sky blue) for buttons and logo
- **Animated status dot** to show the app is `LIVE`
- **Color-coded status badges** (yellow = pending, blue = in_transit, green = delivered)
- **Red stock count** when inventory quantity < 10

---

## 📦 4. `Dockerfile` — How to Build the Docker Image

**What it is:** A set of instructions that tells Docker how to package the application into a portable, self-contained image.

**Two-stage build explained:**

```dockerfile
# Stage 1 - Builder: Install Python packages
FROM python:3.12-slim as builder
WORKDIR /build
COPY app/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
```
> In Stage 1, we install all Python dependencies into a temporary "builder" container. This keeps the final image lean.

```dockerfile
# Stage 2 - Production: Copy only what we need
FROM python:3.12-slim
COPY --from=builder /root/.local /home/appuser/.local
COPY app/ .
```
> In Stage 2, we copy only the installed packages and application code — no build tools, caches, or temporary files. This makes the final image **much smaller and secure**.

**Security feature:** The app runs as a **non-root user** (`appuser`) inside the container. This means if the container is compromised, the attacker cannot gain root access to the host machine.

**Port:** The container exposes port `5000` internally. When we run it on EC2, we map it: `-p 3000:5000` (EC2 port 3000 → container port 5000).

---

## 🐙 5. `docker-compose.yml` — Run Locally with One Command

**What it is:** A configuration file that lets you run the entire app locally with `docker compose up`. Instead of typing a long `docker run` command every time, compose handles it all.

```yaml
ports:
  - "5000:5000"   # maps your local machine's port 5000 to the container's port 5000
volumes:
  - ./app:/app    # hot-reload: code changes reflect instantly without rebuilding
healthcheck:
  test: curl -f http://localhost:5000/health
```

**When to use it:** During **local development** on your machine. On EC2, we use plain `docker run` instead.

---

## ⚙️ 6. `.github/workflows/ci.yml` — Continuous Integration (CI)

**What it is:** A GitHub Actions workflow that **automatically runs every time you push any commit** to any branch. It ensures your code is always tested before it goes anywhere.

**What it does:**
1. Checks out your code
2. Sets up Python 3.12
3. Installs dependencies
4. Runs **Flake8** (linting — checks for code style errors)
5. Runs **Pytest** (unit tests — runs all tests in `test_app.py`)
6. Generates a **code coverage report**

**Why this matters:** If a developer pushes broken code, CI will catch it within minutes and block the bad code from going to production.

---

## 🚀 7. `.github/workflows/cd.yml` — Continuous Deployment (CD)

**What it is:** A GitHub Actions workflow that **automatically deploys the app to AWS EC2** every time a push is made to the `main` branch.

**Pipeline flow:**

```
Push to main
    ↓
1. build-and-push    → Builds Docker image → Pushes to GHCR (GitHub Container Registry)
    ↓
2. security-scan     → Runs Trivy scanner to check for known vulnerabilities in the image
    ↓
3. deploy-to-ec2     → SSH's into EC2 → Pulls the new image → Restarts container
    ↓
4. deploy-summary    → Reports the result of all 3 steps
```

**Required GitHub Secrets:**

| Secret | What it stores |
|--------|---------------|
| `EC2_HOST` | EC2 public IP (`13.51.195.152`) |
| `EC2_USER` | SSH username (`ec2-user`) |
| `EC2_SSH_KEY` | Contents of the `.pem` key file |

---

## 🛠️ 8. `ec2-setup.sh` — EC2 Bootstrap Script (Run Once)

**What it is:** A shell script you run **once** on a brand-new EC2 instance to prepare it for running Docker containers.

**What it does:**
1. Updates all system packages (`apt-get update`)
2. Installs Docker and Docker Compose
3. Starts the Docker service and enables it on boot
4. Adds your user to the `docker` group (so you don't need `sudo` every time)
5. Logs your EC2 instance into GitHub Container Registry (GHCR) so it can pull private images

---

## 📥 9. `ec2-deploy.sh` — Deploy/Update Script

**What it is:** A script that pulls the latest Docker image from GHCR and restarts the container. You run this manually when you want to update the app on EC2 without waiting for the GitHub Actions pipeline.

**What it does:**
1. Pulls the latest image: `docker pull ghcr.io/Yashag/Logistics_ci_cd:latest`
2. Stops the old container
3. Removes it
4. Starts a fresh container on port 3000
5. Waits 10 seconds, then runs a health check to confirm it's running

---

## 🧪 10. `app/test_app.py` — Unit Tests

**What it is:** A suite of automated tests for all the Flask API endpoints, written using **Pytest** and Flask's built-in test client.

**What is tested:** Every route in the app — creating shipments, tracking them, updating locations, adding inventory, creating orders, optimizing routes, error handling (404, 400, 409), and the health check.

**Why tests matter:** Tests are the safety net that lets you change code without fear of breaking things. The CI pipeline runs these automatically on every commit.

---

## 🔑 11. `app/requirements.txt` — Python Dependencies

```
Flask==3.1.0        ← Web framework
gunicorn==23.0.0    ← Production WSGI server (used in Docker)
requests==2.32.3    ← HTTP library (used in Dockerfile health check)
pytest              ← Testing framework
pytest-cov          ← Test coverage reporting
flake8              ← Code linting
```

---

## ☁️ 12. AWS EC2 — Where the App Runs

**What it is:** A virtual server (Ubuntu/Amazon Linux) running in the cloud on Amazon Web Services.

**How our app runs on it:**
- Docker is installed on the EC2 instance
- Our app runs as a Docker container on port **3000**
- The container auto-restarts if it crashes (`--restart unless-stopped`)
- The **Security Group** acts as a firewall — we opened port 3000 so the internet can reach the app

**Live URL:** [http://13.51.195.152:3000](http://13.51.195.152:3000)

---

## 🔄 End-to-End Flow Summary

```
Developer writes code
        ↓
git push to GitHub
        ↓
CI runs tests automatically (ci.yml)
        ↓   (if tests pass and push is to main)
CD builds Docker image (cd.yml)
        ↓
Image pushed to GHCR
        ↓
Security scan (Trivy)
        ↓
SSH into EC2 → pull new image → restart container
        ↓
Live at http://13.51.195.152:3000 ✅
```

This entire cycle happens **automatically** — from code push to live deployment — without any manual steps.
