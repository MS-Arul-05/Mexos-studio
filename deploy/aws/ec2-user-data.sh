#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Mexos Studio — EC2 user data (cloud-init) for Ubuntu 24.04 on a t3.micro
# Region: ap-south-1 (Mumbai)
#
# WHAT THIS IS
#   Paste this whole file into the "User data" box in Step: "Advanced details"
#   when launching the EC2 instance (or pass it via
#   `aws ec2 run-instances --user-data file://deploy/aws/ec2-user-data.sh`).
#   Cloud-init runs it ONCE, as root, on first boot. It prepares the box; it
#   deploys nothing by itself.
#
# WHAT IT DOES
#   1. Logs everything to /var/log/user-data.log (and the cloud-init log).
#   2. Creates a 2G swapfile — mandatory: a t3.micro has 1GB RAM and Prisma
#      migrations / image pulls will OOM without it.
#   3. Installs Docker Engine + the compose plugin from Docker's official
#      apt repo, with container log rotation configured.
#   4. Enables Docker and lets the `ubuntu` user run it without sudo.
#   5. Installs unattended-upgrades (automatic security patches).
#   6. Installs AWS CLI v2 (used for ECR login via the instance's IAM role —
#      no access keys are ever stored on this box).
#   7. Creates /opt/mexos (owned by ubuntu) and writes /opt/mexos/deploy.sh,
#      the one-command deploy helper.
#
# WHAT IT DOES **NOT** DO (deliberately — no secrets live in this file)
#   - It does NOT write .env. You scp your real .env to /opt/mexos/.env later.
#   - It does NOT write the compose file. You scp deploy/aws/docker-compose
#     file from the repo to /opt/mexos/docker-compose.yml later.
#   - It does NOT install TLS/certbot. CloudFront terminates HTTPS; nginx on
#     this box listens on plain :80 (security group: allow 80 only, plus 22).
#
# AFTER FIRST BOOT (from your machine, Git Bash on Windows is fine)
#   scp -i mexos-key.pem docker-compose.yml ubuntu@<EC2-IP>:/opt/mexos/
#   scp -i mexos-key.pem nginx.conf         ubuntu@<EC2-IP>:/opt/mexos/
#   scp -i mexos-key.pem .env               ubuntu@<EC2-IP>:/opt/mexos/.env
#   ssh -i mexos-key.pem ubuntu@<EC2-IP>
#   cd /opt/mexos && ./deploy.sh
#
# NOTE FOR WINDOWS EDITORS: this file must keep LF line endings (a CRLF
# shebang breaks cloud-init). deploy/aws/.gitattributes enforces this.
# ─────────────────────────────────────────────────────────────────────────────
set -euxo pipefail

# ── 1. Log everything this script does ──────────────────────────────────────
# tee -a: output lands in /var/log/user-data.log AND the default
# /var/log/cloud-init-output.log. If boot provisioning ever fails, read these.
exec > >(tee -a /var/log/user-data.log) 2>&1
echo "==> user-data started at $(date -Is)"

export DEBIAN_FRONTEND=noninteractive

# ── 2. 2G swapfile (1GB RAM box — this is not optional) ─────────────────────
if ! swapon --show | grep -q '^/swapfile'; then
  # fallocate is instant on ext4 (the Ubuntu AMI root fs); dd is the fallback.
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  # fstab entry so swap survives reboots.
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Prefer RAM; touch swap only under real pressure (default 60 thrashes a 1GB box).
echo 'vm.swappiness=10' > /etc/sysctl.d/99-mexos-swap.conf
sysctl --system

# ── 3. Base packages + automatic security patches ───────────────────────────
apt-get update
apt-get install -y ca-certificates curl gnupg unzip unattended-upgrades

# Turn unattended security upgrades on (this file is what
# `dpkg-reconfigure unattended-upgrades` would create).
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

# ── 4. Docker Engine + compose plugin (Docker's official apt repo) ──────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Rotate container logs BEFORE the daemon first starts — an unbounded json-file
# log will eventually fill the 8-30GB root volume.
install -m 0755 -d /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF

systemctl enable --now docker
# Let the ubuntu user run docker without sudo (applies from their next login —
# your first SSH session after boot already counts as "next login").
usermod -aG docker ubuntu

# ── 5. AWS CLI v2 (ECR login uses the instance IAM role — no keys on disk) ──
if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi
aws --version

# ── 6. App directory + deploy helper ─────────────────────────────────────────
install -d -o ubuntu -g ubuntu /opt/mexos

# The single-quoted 'DEPLOY' heredoc writes deploy.sh EXACTLY as-is — nothing
# below is expanded now; it all runs when ubuntu executes ./deploy.sh later.
cat > /opt/mexos/deploy.sh <<'DEPLOY'
#!/usr/bin/env bash
# /opt/mexos/deploy.sh — pull the newest API image from ECR, run database
# migrations, and (re)start the stack. Safe to run as many times as you like.
#
# Prerequisites (one-time, copied from the repo — see deploy/aws/ guide):
#   /opt/mexos/docker-compose.yml   nginx(:80) -> api(:4000) + redis stack
#   /opt/mexos/nginx.conf           mounted by the nginx service
#   /opt/mexos/.env                 real production secrets (chmod 600, never
#                                   committed) — must include API_IMAGE, e.g.
#                                   API_IMAGE=<acct>.dkr.ecr.ap-south-1.amazonaws.com/mexos-api:latest
# The instance's IAM role must allow ECR pulls (AmazonEC2ContainerRegistryReadOnly).
set -euo pipefail
cd /opt/mexos

AWS_REGION="ap-south-1"

# ── Preflight: fail with a clear message instead of a cryptic docker error ──
[ -f .env ] || { echo "ERROR: /opt/mexos/.env is missing. scp your production .env here first." >&2; exit 1; }
[ -f docker-compose.yml ] || { echo "ERROR: /opt/mexos/docker-compose.yml is missing. scp it from the repo (deploy/aws/)." >&2; exit 1; }
chmod 600 .env

# Read API_IMAGE from .env (tr strips quotes and any Windows \r).
API_IMAGE="$(grep -E '^API_IMAGE=' .env | tail -n1 | cut -d= -f2- | tr -d '"\r')"
[ -n "${API_IMAGE}" ] || { echo "ERROR: API_IMAGE is not set in /opt/mexos/.env" >&2; exit 1; }
ECR_REGISTRY="${API_IMAGE%%/*}"

echo "==> Logging in to ECR (${ECR_REGISTRY})"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> Pulling images"
docker compose pull

echo "==> Running database migrations (against RDS, via .env DATABASE_URL)"
docker run --rm --env-file .env "${API_IMAGE}" npx prisma migrate deploy

echo "==> Starting the stack"
docker compose up -d

echo "==> Removing old, unused image layers (disk is small)"
docker image prune -f

echo "==> Deployed. Verify with:"
echo "    docker compose ps"
echo "    curl -s http://localhost/api/health"
DEPLOY

chmod 755 /opt/mexos/deploy.sh
chown ubuntu:ubuntu /opt/mexos/deploy.sh

echo "==> user-data finished OK at $(date -Is)"
echo "==> Next: scp docker-compose.yml, nginx.conf and .env to /opt/mexos, then run /opt/mexos/deploy.sh"
