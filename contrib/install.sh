#!/usr/bin/env bash
set -euo pipefail

REPO="midoBB/ComicReader"
BIN_DIR="${HOME}/.local/bin"
CONF_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/comicreader"
DATA_DIR="${HOME}/.local/share/comicreader/comics"
SYSD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

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
mkdir -p "$BIN_DIR"
cp "${DIR}comicreader" "${BIN_DIR}/comicreader"
chmod 755 "${BIN_DIR}/comicreader"

# Config (don't overwrite existing)
if [ ! -f "${CONF_DIR}/config.yaml" ]; then
  mkdir -p "$CONF_DIR"
  cp "${DIR}config.yaml" "${CONF_DIR}/config.yaml"
  chmod 644 "${CONF_DIR}/config.yaml"
  echo "Config installed to ${CONF_DIR}/config.yaml — edit it before starting the service."
else
  echo "Existing config at ${CONF_DIR}/config.yaml left unchanged."
fi

# Data directory
mkdir -p "$DATA_DIR"

# Systemd user unit
mkdir -p "$SYSD_DIR"
cp "${DIR}comicreader.service" "${SYSD_DIR}/comicreader.service"
chmod 644 "${SYSD_DIR}/comicreader.service"
systemctl --user daemon-reload

echo ""
echo "Done. Next steps:"
echo "  1. Edit ${CONF_DIR}/config.yaml"
echo "  2. systemctl --user enable --now comicreader"
echo "  3. Open http://<your-server>:8386"
