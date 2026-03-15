# ComicReader

A self-hosted web reader for CBZ comic collections.

## Install

### Quick install (Linux)

```sh
curl -fsSL https://raw.githubusercontent.com/midoBB/ComicReader/main/contrib/install.sh | sudo bash
```

### Manual install

Download and extract the latest release archive for your architecture from the [Releases](https://github.com/midoBB/ComicReader/releases) page.

```sh
# example for linux/amd64
curl -L https://github.com/midoBB/ComicReader/releases/latest/download/comicreader-latest-linux-amd64.tar.gz \
  | tar -xz
cd comicreader-*-linux-amd64
sudo install -Dm755 comicreader /usr/local/bin/comicreader
```

Each archive contains:
- `comicreader` — the binary
- `config.yaml` — example configuration
- `comicreader.service` — systemd unit file

## Configure

```sh
sudo mkdir /etc/comicreader
sudo install -Dm644 config.yaml /etc/comicreader/config.yaml
```

Edit `/etc/comicreader/config.yaml`:

```yaml
library_path: /var/lib/comicreader/comics  # directory containing .cbz files
port: 8386
host: "0.0.0.0"                            # use 127.0.0.1 to bind localhost only
```

The database (`data.db`) is created automatically in the same directory as the config file.

## Run as a service

```sh
sudo install -Dm644 comicreader.service /etc/systemd/system/comicreader.service

sudo mkdir -p /var/lib/comicreader/comics

sudo systemctl daemon-reload
sudo systemctl enable --now comicreader
```

Then open `http://<your-server>:8386` in a browser.

## Usage

- Drop `.cbz` files into your `library_path` — the library resyncs automatically.
- To force a resync without restarting: `sudo systemctl kill -s HUP comicreader`
- To check logs: `journalctl -u comicreader -f`
