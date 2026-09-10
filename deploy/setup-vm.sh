#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Foundereum — AWS VM Bootstrap Script
# Run as root (or with sudo) on a fresh Ubuntu 22.04+ / Amazon Linux 2023
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/Himesh-Kundal/foundereum/main/deploy/setup-vm.sh | sudo bash
#   — or —
#   sudo bash deploy/setup-vm.sh
# ──────────────────────────────────────────────────────────────
set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║   Foundereum VM Setup                    ║"
echo "╚══════════════════════════════════════════╝"

# ── 0. Detect deploy user ──────────────────────────────────
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    DEPLOY_USER="$SUDO_USER"
elif id "ec2-user" &>/dev/null; then
    DEPLOY_USER="ec2-user"
elif id "ubuntu" &>/dev/null; then
    DEPLOY_USER="ubuntu"
else
    DEPLOY_USER=$(id -un)
fi
echo "→ Deploy user: $DEPLOY_USER"

# ── 1. System updates & package installation ────────────────
echo "→ Updating system packages..."
if command -v apt-get &>/dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl git make jq htop unzip fail2ban ufw
elif command -v dnf &>/dev/null; then
    dnf update -y
    dnf install -y make jq htop unzip git || true
fi

# ── 2. Docker ───────────────────────────────────────────────
echo "→ Installing Docker..."
if ! command -v docker &>/dev/null; then
    if command -v dnf &>/dev/null; then
        dnf install -y docker
    else
        curl -fsSL https://get.docker.com | sh
    fi
fi

# Enable and start Docker
systemctl enable --now docker

# Add deploy user to docker group
if id "$DEPLOY_USER" &>/dev/null; then
    usermod -aG docker "$DEPLOY_USER" || true
    echo "  Added $DEPLOY_USER to docker group"
fi

# ── 3. Docker Compose (plugin) ──────────────────────────────
echo "→ Verifying Docker Compose..."
if ! docker compose version &>/dev/null; then
    echo "  Installing Docker Compose plugin..."
    COMPOSE_DIR="/usr/local/lib/docker/cli-plugins"
    mkdir -p "$COMPOSE_DIR"
    ARCH=$(uname -m)
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    if [ -z "$COMPOSE_VERSION" ] || [ "$COMPOSE_VERSION" = "null" ]; then
        COMPOSE_VERSION="v2.29.7"
    fi
    curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
        -o "${COMPOSE_DIR}/docker-compose"
    chmod +x "${COMPOSE_DIR}/docker-compose"
    # Also symlink for docker runtimes looking in /usr/libexec or /usr/lib
    mkdir -p /usr/libexec/docker/cli-plugins /usr/lib/docker/cli-plugins
    ln -sf "${COMPOSE_DIR}/docker-compose" /usr/libexec/docker/cli-plugins/docker-compose
    ln -sf "${COMPOSE_DIR}/docker-compose" /usr/lib/docker/cli-plugins/docker-compose
fi
docker compose version || echo "Docker compose installed"

# ── 4. Firewall ─────────────────────────────────────────────
echo "→ Checking firewall..."
if command -v ufw &>/dev/null; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw --force enable || true
    echo "  UFW configured: SSH + HTTP only"
elif command -v firewall-cmd &>/dev/null; then
    if systemctl is-active --quiet firewalld; then
        firewall-cmd --permanent --add-service=ssh || true
        firewall-cmd --permanent --add-port=80/tcp || true
        firewall-cmd --reload || true
        echo "  Firewalld configured: SSH + HTTP only"
    fi
fi

# ── 5. Fail2ban ─────────────────────────────────────────────
if systemctl list-unit-files | grep -q fail2ban; then
    echo "→ Configuring fail2ban..."
    systemctl enable --now fail2ban || true
fi

# ── 6. SSH hardening ────────────────────────────────────────
echo "→ Hardening SSH..."
SSHD_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSHD_CONFIG" ]; then
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
    systemctl reload sshd || systemctl reload ssh || systemctl restart sshd || true
fi

# ── 7. App directory ───────────────────────────────────────
echo "→ Setting up app directory..."
APP_DIR="/home/${DEPLOY_USER}/foundereum"

if [ ! -d "$APP_DIR" ]; then
    sudo -u "$DEPLOY_USER" git clone https://github.com/Himesh-Kundal/foundereum.git "$APP_DIR"
else
    echo "  $APP_DIR already exists, updating latest commits..."
    sudo -u "$DEPLOY_USER" git -C "$APP_DIR" pull origin main || true
fi

# Create .env from template if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/deploy/.env.production.example" ]; then
        cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/.env"
        chmod 600 "$APP_DIR/.env"
        chown "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR/.env"
        echo "  Created .env from template — remember to configure secrets!"
    fi
fi

# ── 8. Systemd service ─────────────────────────────────────
echo "→ Creating systemd service..."
DOCKER_BIN=$(command -v docker || echo "/usr/bin/docker")
cat > /etc/systemd/system/foundereum.service << EOF
[Unit]
Description=Foundereum Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${DOCKER_BIN} compose -f docker-compose.prod.yml up -d --remove-orphans
ExecStop=${DOCKER_BIN} compose -f docker-compose.prod.yml down
ExecReload=${DOCKER_BIN} compose -f docker-compose.prod.yml up -d --remove-orphans
TimeoutStartSec=180

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable foundereum
echo "  Created foundereum.service (auto-start on boot)"

# ── 9. Log rotation ────────────────────────────────────────
echo "→ Configuring Docker log rotation..."
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF
systemctl restart docker || true
fi

# ── 10. Swap (for instances with < 4GB RAM) ────────────────
echo "→ Checking swap..."
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 4096 ]; then
        echo "  Creating 2GB swap file..."
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ VM Setup Complete!                  ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  App Directory: ~/foundereum             ║"
echo "║  Deploy User:   ${DEPLOY_USER}                   ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
