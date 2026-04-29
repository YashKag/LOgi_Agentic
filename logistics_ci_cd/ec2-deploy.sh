#!/bin/bash
# =============================================================================
# EC2 Deploy Script - Run to pull the latest image & restart the app
# =============================================================================
# Usage:
#   chmod +x ec2-deploy.sh
#   ./ec2-deploy.sh
#
# Prerequisites:
#   - ec2-setup.sh has been run (Docker installed, logged in to GHCR)
#   - Set GITHUB_REPO below to your GitHub username/repo (e.g. yashj/logistics-ci-cd)
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# CONFIGURATION - Edit these values
# ---------------------------------------------------------------------------
GITHUB_REPO="Yashag/Logistics_ci_cd"
REGISTRY="ghcr.io"
IMAGE="${REGISTRY}/${GITHUB_REPO}:latest"
CONTAINER_NAME="logistics-app"
APP_PORT="5000"
APP_DIR="/home/ubuntu/logistics-ci-cd"   # Where docker-compose.yml lives on EC2

# ---------------------------------------------------------------------------
echo "============================================"
echo "  Logistics App - EC2 Deploy Script"
echo "============================================"
echo "  Image  : $IMAGE"
echo "  Port   : $APP_PORT"
echo ""

# ---------------------------------------------------------------------------
# 1. Pull the latest Docker image from GHCR
# ---------------------------------------------------------------------------
echo "[1/4] Pulling latest image from GHCR..."
docker pull "$IMAGE"
echo "  ✅ Image pulled: $IMAGE"

# ---------------------------------------------------------------------------
# 2. Stop and remove the old container (if running)
# ---------------------------------------------------------------------------
echo "[2/4] Stopping existing container (if any)..."
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    docker stop "$CONTAINER_NAME"
    echo "  ✅ Stopped container: $CONTAINER_NAME"
fi

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    docker rm "$CONTAINER_NAME"
    echo "  ✅ Removed container: $CONTAINER_NAME"
fi

# ---------------------------------------------------------------------------
# 3. Start the new container
# ---------------------------------------------------------------------------
echo "[3/4] Starting new container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$APP_PORT:5000" \
    -e FLASK_ENV=production \
    -e PYTHONUNBUFFERED=1 \
    "$IMAGE"

echo "  ✅ Container started: $CONTAINER_NAME"

# ---------------------------------------------------------------------------
# 4. Health check
# ---------------------------------------------------------------------------
echo "[4/4] Running health check (waiting 10s for app to start)..."
sleep 10

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/health || true)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅ Health check PASSED (HTTP $HTTP_STATUS)"
else
    echo "  ⚠️  Health check returned HTTP $HTTP_STATUS — check logs below:"
    docker logs "$CONTAINER_NAME" --tail 30
fi

# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  ✅ Deployment Complete!"
echo "============================================"
echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<EC2-PUBLIC-IP>")
echo "  App URL : http://$PUBLIC_IP:$APP_PORT"
echo "  Health  : http://$PUBLIC_IP:$APP_PORT/health"
echo ""
echo "  Useful commands:"
echo "    docker logs $CONTAINER_NAME -f          # Follow logs"
echo "    docker ps                               # Check container status"
echo "    docker stop $CONTAINER_NAME             # Stop the app"
echo ""
