#!/bin/bash
# One-time server setup, run as root by release.sh before every release.
# Every step is skipped when already done, so re-running it is safe.
#
# Usage: bootstrap.sh <release dir>
set -euo pipefail

release_dir=$1
node_major=$(tr -dc '0-9' < "$release_dir/.nvmrc")

export DEBIAN_FRONTEND=noninteractive

# Node.js from NodeSource, matching the major version in .nvmrc.
if ! node --version 2>/dev/null | grep -q "^v${node_major}\."; then
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${node_major}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi
corepack enable

if ! command -v nginx > /dev/null; then
  apt-get update
  apt-get install -y nginx
  rm -f /etc/nginx/sites-enabled/default
fi

# 1GB of swap: the t4g.micro has 1GB of RAM.
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Unprivileged user the backend runs as.
if ! id pandanstreet > /dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin pandanstreet
fi

install -d -m 755 /opt/pandanstreet/releases
install -d -m 700 /etc/pandanstreet/tls

install -m 644 "$release_dir/deploy/pandanstreet-backend.service" \
  /etc/systemd/system/pandanstreet-backend.service
systemctl daemon-reload
systemctl enable pandanstreet-backend
