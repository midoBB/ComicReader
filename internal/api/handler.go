package api

import (
	"errors"
	"log/slog"
	"net/url"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/config"
	"github.com/midoBB/ComicReader/internal/store"
)

type Handler struct {
	cfg    *config.Config
	store  *store.Store
	logger *slog.Logger
}

func NewHandler(cfg *config.Config, s *store.Store, logger *slog.Logger) *Handler {
	return &Handler{cfg: cfg, store: s, logger: logger}
}

func (h *Handler) RegisterRoutes(e *echo.Echo) {
	g := e.Group("/api")
	g.GET("/meta", h.getAllMeta)
	g.GET("/comics", h.listComics)
	g.GET("/comics/:slug/thumbnail", h.getThumbnail)
	g.GET("/comics/:slug/pages", h.listPages)
	g.GET("/comics/:slug/pages/:page", h.getPage)
	g.GET("/comics/:slug/meta", h.getComicMeta)
	g.PUT("/comics/:slug/rename", h.renameComic)
	g.DELETE("/comics/:slug", h.deleteComic)
	g.PUT("/comics/:slug/favorite", h.setFavorite)
	g.PUT("/comics/:slug/opened", h.markOpened)
	g.PUT("/comics/:slug/progress", h.setProgress)
}

// safeCBZPath validates and resolves a slug to an absolute CBZ path.
func (h *Handler) safeCBZPath(slug string) (string, error) {
	decoded, err := url.PathUnescape(slug)
	if err != nil {
		return "", err
	}
	if strings.ContainsAny(decoded, `/\`) {
		return "", errors.New("invalid slug")
	}
	clean := filepath.Clean(filepath.Join(h.cfg.LibraryPath, decoded+".cbz"))
	if !strings.HasPrefix(clean, filepath.Clean(h.cfg.LibraryPath)+string(filepath.Separator)) {
		return "", errors.New("path traversal detected")
	}
	return clean, nil
}
