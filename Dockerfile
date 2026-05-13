# Stage 1: Build the frontend (React/Vite)
FROM node:24-alpine AS frontend-builder
WORKDIR /app/web
RUN npm install -g pnpm@10 && corepack enable && corepack prepare pnpm@10 --activate
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

# Stage 2: Build the backend (Go)
FROM golang:1.26.1-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN rm -rf static && mkdir static
COPY --from=frontend-builder /app/static ./static
RUN CGO_ENABLED=0 go build -o comicreader main.go

# Stage 3: Final slim image
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend-builder /app/comicreader /app/comicreader
RUN mkdir -p /etc/comicreader /data/thumbcache /manga && \
    printf "library_path: /manga\ndb_path: /data/data.db\nthumb_cache_path: /data/thumbcache\nport: 8386\nhost: 0.0.0.0\n" > /etc/comicreader/config.yaml
VOLUME ["/data", "/manga"]
EXPOSE 8386
ENTRYPOINT ["/app/comicreader", "--config", "/etc/comicreader/config.yaml"]
