# ComicReader

A self-hosted web reader for CBZ comic collections.

## Install

### Quick install (Linux)

No root required — installs everything under your home directory.

```sh
curl -fsSL https://raw.githubusercontent.com/midoBB/ComicReader/main/contrib/install.sh | bash
```

This installs:
- Binary → `~/.local/bin/comicreader`
- Config → `~/.config/comicreader/config.yaml`
- Systemd unit → `~/.config/systemd/user/comicreader.service`

### Manual install

Download and extract the latest release archive for your architecture from the [Releases](https://github.com/midoBB/ComicReader/releases) page.

```sh
# example for linux/amd64
curl -L https://github.com/midoBB/ComicReader/releases/latest/download/comicreader-latest-linux-amd64.tar.gz \
  | tar -xz
cd comicreader-*-linux-amd64
install -Dm755 comicreader ~/.local/bin/comicreader
```

Each archive contains:
- `comicreader` — the binary
- `config.yaml` — example configuration
- `comicreader.service` — systemd user unit file

## Configure

```sh
mkdir -p ~/.config/comicreader
install -Dm644 config.yaml ~/.config/comicreader/config.yaml
```

Edit `~/.config/comicreader/config.yaml`:

```yaml
library_path: /home/user/comics  # absolute directory containing .cbz files
port: 8386
host: "0.0.0.0"         # use 127.0.0.1 to bind localhost only
```

The database (`data.db`) is created automatically in the same directory as the config file.

## Run as a service

```sh
mkdir -p ~/.config/systemd/user
install -Dm644 comicreader.service ~/.config/systemd/user/comicreader.service

systemctl --user daemon-reload
systemctl --user enable --now comicreader
```

Then open `http://<your-server>:8386` in a browser.

> **Note:** On a headless server where you want the service to run after logout, enable linger once (requires root):
> ```sh
> sudo loginctl enable-linger "$USER"
> ```

## Docker / Podman

### Build the image

```sh
docker build -t comicreader:latest .
```

### Run with Docker

```sh
docker run -d \
  --name comicreader \
  -p 8386:8386 \
  -v /path/to/your/comics:/manga \
  -v comicreader-data:/data \
  comicreader:latest
```

### Run with Podman Quadlet

1. Build the image:
   ```sh
   podman build -t comicreader:latest .
   ```

2. Copy the Quadlet file and edit the manga path:
   ```sh
   cp contrib/comicreader.container ~/.config/containers/systemd/comicreader.container
   # Edit ~/.config/containers/systemd/comicreader.container and set your manga path
   ```

3. Reload and start the service:
   ```sh
   systemctl --user daemon-reload
   systemctl --user enable --now podman-comicreader.service
   ```

### Volumes

| Volume | Description |
|--------|-------------|
| `/manga` | Mount your CBZ comic library here with read-write access |
| `/data` | Persistent storage for database and thumbnail cache |

The config is baked into the image at `/etc/comicreader/config.yaml` with sensible defaults.

## Usage

- Drop `.cbz` files into your `library_path` — the library resyncs automatically.
- Rename and delete actions operate on the real `.cbz` files in `library_path`; make sure the path is writable and backed up as needed.
- To force a resync without restarting: `systemctl --user kill -s HUP comicreader`
- To check logs: `journalctl --user -u comicreader -f`
