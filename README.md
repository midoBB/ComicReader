# ComicReader

A self-hosted web reader for CBZ comic collections.

## Install

Download the latest binary for your platform from the [Releases](https://github.com/midoBB/ComicReader/releases) page.

```sh
# example for linux/amd64
curl -L https://github.com/midoBB/ComicReader/releases/latest/download/comicreader-linux-amd64 -o comicreader
chmod +x comicreader
sudo mv comicreader /usr/local/bin/comicreader
```

## Configure

```sh
sudo mkdir /etc/comicreader
sudo curl -L https://raw.githubusercontent.com/midoBB/ComicReader/main/contrib/config.yaml \
  -o /etc/comicreader/config.yaml
```

Edit `/etc/comicreader/config.yaml`:

```yaml
library_path: /path/to/your/comics  # directory containing .cbz files
port: 8386
host: "0.0.0.0"                     # use 127.0.0.1 to bind localhost only
```

The database (`data.db`) is created automatically in the same directory as the config.

## Run as a service

```sh
sudo curl -L https://raw.githubusercontent.com/midoBB/ComicReader/main/contrib/comicreader.service \
  -o /etc/systemd/system/comicreader.service

sudo mkdir -p /var/lib/comicreader/comics
sudo chown -R $USER:$USER /etc/comicreader /var/lib/comicreader

sudo systemctl daemon-reload
sudo systemctl enable --now comicreader
```

Then open `http://<your-server>:8386` in a browser.

## Usage

- Drop `.cbz` files into your `library_path` — the library resyncs automatically.
- To force a resync without restarting: `sudo systemctl kill -s HUP comicreader`
- To check logs: `journalctl -u comicreader -f`
