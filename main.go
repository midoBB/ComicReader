package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/midoBB/ComicReader/internal/api"
	"github.com/midoBB/ComicReader/internal/config"
	"github.com/midoBB/ComicReader/internal/store"
	"github.com/spf13/cobra"
)

//go:embed static
var staticFiles embed.FS

func logListenAddrs(logger *slog.Logger, port int) {
	ifaces, err := net.Interfaces()
	if err != nil {
		logger.Info("available", "addr", fmt.Sprintf("http://0.0.0.0:%d/", port))
		return
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			var ip net.IP
			switch v := a.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			var host string
			if ip4 := ip.To4(); ip4 != nil {
				host = ip4.String()
			} else {
				host = "[" + ip.String() + "]"
			}
			logger.Info(fmt.Sprintf("available @ http://%s:%d/  (%d-%s)", host, port, iface.Index, iface.Name))
		}
	}
}

func startWatcher(logger *slog.Logger, s *store.Store, libraryPath, thumbCachePath string) (*fsnotify.Watcher, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	if err := watcher.Add(libraryPath); err != nil {
		watcher.Close()
		return nil, err
	}
	go func() {
		var debounce *time.Timer
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if !strings.EqualFold(filepath.Ext(event.Name), ".cbz") {
					continue
				}
				if event.Op&(fsnotify.Create|fsnotify.Remove|fsnotify.Rename) == 0 {
					continue
				}
				if debounce != nil {
					debounce.Stop()
				}
				debounce = time.AfterFunc(2*time.Second, func() {
					added, removed, err := s.SyncLibrary(libraryPath, thumbCachePath)
					if err != nil {
						logger.Error("failed to sync library", "err", err)
					} else {
						logger.Info("library resynced", "added", added, "removed", removed)
					}
				})
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				logger.Error("watcher error", "err", err)
			}
		}
	}()
	return watcher, nil
}

var Version = "dev"

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	var configPath string

	rootCmd := &cobra.Command{
		Use:     "comicreader",
		Short:   "A self-hosted web reader for CBZ comic collections.",
		Version: Version,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load(configPath)
			if err != nil {
				logger.Error("failed to load config", "err", err)
				return err
			}
			logger.Info("config loaded", "library", cfg.LibraryPath, "db", cfg.DBPath)

			staticFS, err := fs.Sub(staticFiles, "static")
			if err != nil {
				logger.Error("failed to create static FS", "err", err)
				return err
			}

			s, err := store.Open(cfg.DBPath)
			if err != nil {
				logger.Error("failed to open store", "db", cfg.DBPath, "err", err)
				return err
			}
			defer s.Close()
			logger.Info("store opened", "db", cfg.DBPath)

			added, removed, err := s.SyncLibrary(cfg.LibraryPath, cfg.ThumbCachePath)
			if err != nil {
				logger.Error("failed to sync library", "err", err)
				return err
			}
			logger.Info("library synced", "added", added, "removed", removed)

			e := echo.New()
			e.HideBanner = true
			e.HidePort = true
			e.Use(api.RequestLogger(logger))
			e.Use(middleware.Recover())

			h := api.NewHandler(cfg, s, logger)
			h.RegisterRoutes(e)
			e.GET("/*", echo.WrapHandler(api.NewSPAHandler(staticFS)))

			watcher, err := startWatcher(logger, s, cfg.LibraryPath, cfg.ThumbCachePath)
			if err != nil {
				logger.Error("failed to start watcher", "err", err)
				return err
			}
			defer watcher.Close()

			quit := make(chan os.Signal, 1)
			signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)

			addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
			logListenAddrs(logger, cfg.Port)

			go func() {
				if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
					logger.Error("server stopped", "err", err)
					os.Exit(1)
				}
			}()

			for sig := range quit {
				if sig == syscall.SIGHUP {
					logger.Info("received SIGHUP, resyncing library")
					added, removed, err := s.SyncLibrary(cfg.LibraryPath, cfg.ThumbCachePath)
					if err != nil {
						logger.Error("failed to sync library", "err", err)
					} else {
						logger.Info("library resynced", "added", added, "removed", removed)
					}
					continue
				}
				logger.Info("shutting down", "signal", sig)
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				if err := e.Shutdown(ctx); err != nil {
					logger.Error("shutdown error", "err", err)
				}
				break
			}

			return nil
		},
	}

	rootCmd.PersistentFlags().StringVar(&configPath, "config", "config.yaml", "path to config file")

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
