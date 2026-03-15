#!/usr/bin/env bash
set -euo pipefail

REPO="midoBB/ComicReader"
BIN_DIR="/usr/local/bin"
CONF_DIR="/etc/comicreader"
DATA_DIR="/var/lib/comicreader/comics"
SYSD_DIR="/etc/systemd/system"

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Resolve latest release tag
TAG="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

ARCHIVE="comicreader-${TAG}-linux-${ARCH}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${TAG}/${ARCHIVE}"

echo "Installing ComicReader ${TAG} (${ARCH})..."

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "$URL" | tar -xz -C "$TMPDIR"
DIR="$(ls -d "$TMPDIR"/comicreader-*/)"

# Binary
sudo install -Dm755 "${DIR}comicreader" "${BIN_DIR}/comicreader"

# Config (don't overwrite existing)
if [ ! -f "${CONF_DIR}/config.yaml" ]; then
  sudo mkdir -p "$CONF_DIR"
  sudo install -Dm644 "${DIR}config.yaml" "${CONF_DIR}/config.yaml"
  echo "Config installed to ${CONF_DIR}/config.yaml — edit it before starting the service."
else
  echo "Existing config at ${CONF_DIR}/config.yaml left unchanged."
fi

# Data directory
sudo mkdir -p "$DATA_DIR"

# Systemd unit
sudo install -Dm644 "${DIR}comicreader.service" "${SYSD_DIR}/comicreader.service"
sudo systemctl daemon-reload

echo ""
echo "Done. Next steps:"
echo "  1. Edit ${CONF_DIR}/config.yaml"
echo "  2. sudo systemctl enable --now comicreader"
echo "  3. Open http://<your-server>:8386"
