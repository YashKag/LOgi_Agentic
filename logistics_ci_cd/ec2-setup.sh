#!/bin/bash
# =============================================================================
# EC2 Bootstrap Script - Run ONCE on a fresh Ubuntu EC2 instance
# =============================================================================
# Usage:
#   chmod +x ec2-setup.sh
#   ./ec2-setup.sh
#
# What this does:
#   1. Updates system packages
#   2. Installs Docker & Docker Compose
#   3. Adds the current user to the docker group (no sudo needed)
#   4. Logs into GitHub Container Registry (GHCR)
# =============================================================================

set -e  # Exit immediately if a command fails

echo "============================================"
echo "  Logistics App - EC2 Setup Script"
echo "============================================"

# ---------------------------------------------------------------------------
# 1. Update system packages
# ---------------------------------------------------------------------------
echo "[1/5] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ---------------------------------------------------------------------------
# 2. Install Docker
# ---------------------------------------------------------------------------
echo "[2/5] Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

echo "Docker installed: $(docker --version)"

# ---------------------------------------------------------------------------
# 3. Install Docker Compose (standalone v2)
# ---------------------------------------------------------------------------
echo "[3/5] Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin
echo "Docker Compose installed: $(docker compose version)"

# ---------------------------------------------------------------------------
# 4. Add current user to the docker group (no sudo needed)
# ---------------------------------------------------------------------------
echo "[4/5] Adding user '$(whoami)' to the docker group..."
sudo usermod -aG docker $USER
echo "  NOTE: Log out and log back in for group changes to take effect."
echo "  Or run: newgrp docker"

# ---------------------------------------------------------------------------
# 5. Log in to GitHub Container Registry (GHCR)
# ---------------------------------------------------------------------------
echo "[5/5] Logging in to GitHub Container Registry (GHCR)..."
echo ""
echo "  You need a GitHub Personal Access Token (PAT) with 'read:packages' scope."
echo "  Generate one at: https://github.com/settings/tokens"
echo ""
read -p "  Enter your GitHub username: " GITHUB_USER
read -s -p "  Enter your GitHub PAT (token): " GITHUB_PAT
echo ""

echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
echo "  ✅ Logged in to GHCR as $GITHUB_USER"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  ✅ EC2 Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Run: newgrp docker  (or log out & back in)"
echo "  2. Run: ./ec2-deploy.sh  (to pull & start the app)"
echo ""
