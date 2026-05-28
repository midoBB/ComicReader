.PHONY: all build build-frontend build-backend install clean clean-frontend docker deps

APP_NAME = comicreader
PREFIX ?= /usr/local
BINDIR = $(PREFIX)/bin

# Default target
all: build

# Install dependencies for both frontend and backend
deps:
	cd web && pnpm install
	go mod download

# Build the React frontend
build-frontend: deps
	cd web && pnpm build

ifeq ($(shell git status --porcelain),)
VERSION ?= $(shell git describe --tags --exact-match 2>/dev/null || echo dev)
else
VERSION ?= dev
endif

# Build the Go backend
build-backend:
	go build -trimpath -ldflags="-s -w -X main.Version=$(VERSION)" -o $(APP_NAME) main.go

# Build both frontend and backend
build: build-frontend build-backend

# Install the built binary
install: build
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 $(APP_NAME) $(DESTDIR)$(BINDIR)/$(APP_NAME)

# Clean frontend generated files and dependencies
clean-frontend:
	rm -rf static/*
	rm -rf web/node_modules

# Clean all build artifacts
clean: clean-frontend
	rm -f $(APP_NAME)
	go clean

# Build the Docker image
docker:
	docker build -t $(APP_NAME):latest .
