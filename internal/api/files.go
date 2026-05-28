package api

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/cbz"
)

func (h *Handler) safeCBZTargetPath(name string) (slug, path string, err error) {
	name = strings.TrimSpace(name)
	if strings.EqualFold(filepath.Ext(name), ".cbz") {
		name = strings.TrimSuffix(name, filepath.Ext(name))
	}
	if name == "" || name == "." || name == ".." {
		return "", "", errors.New("name is required")
	}
	if strings.ContainsRune(name, 0) || strings.ContainsAny(name, `/\`) {
		return "", "", errors.New("invalid name")
	}
	if filepath.Clean(name) != name || filepath.Base(name) != name {
		return "", "", errors.New("invalid name")
	}

	clean := filepath.Clean(filepath.Join(h.cfg.LibraryPath, name+".cbz"))
	if !strings.HasPrefix(clean, filepath.Clean(h.cfg.LibraryPath)+string(filepath.Separator)) {
		return "", "", errors.New("path traversal detected")
	}
	return name, clean, nil
}

func (h *Handler) renameComic(c echo.Context) error {
	oldSlug := c.Param("slug")
	oldPath, err := h.safeCBZPath(oldSlug)
	if err != nil {
		h.logger.Warn("invalid rename request", "slug", oldSlug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	newSlug, newPath, err := h.safeCBZTargetPath(body.Name)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if _, err := os.Stat(oldPath); err != nil {
		if os.IsNotExist(err) {
			return echo.NewHTTPError(http.StatusNotFound, "comic not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if oldPath == newPath {
		pc := 0
		if images, err := cbz.ListImages(oldPath); err == nil {
			pc = len(images)
		}
		return c.JSON(http.StatusOK, map[string]any{"comic": Comic{Slug: newSlug, Name: newSlug, PageCount: pc}})
	}

	if _, err := os.Stat(newPath); err == nil {
		return echo.NewHTTPError(http.StatusConflict, "target comic already exists")
	} else if !os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		h.logger.Error("failed to rename comic file", "old", oldPath, "new", newPath, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	if err := h.store.RenameComic(strings.TrimSuffix(filepath.Base(oldPath), ".cbz"), newSlug); err != nil {
		rollbackErr := os.Rename(newPath, oldPath)
		h.logger.Error("failed to rename comic metadata", "old", oldSlug, "new", newSlug, "err", err, "rollback_err", rollbackErr)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if h.cfg.ThumbCachePath != "" {
		oldCache := filepath.Join(h.cfg.ThumbCachePath, strings.TrimSuffix(filepath.Base(oldPath), ".cbz")+".jpg")
		newCache := filepath.Join(h.cfg.ThumbCachePath, newSlug+".jpg")
		os.Remove(newCache)
		if err := os.Rename(oldCache, newCache); err != nil && !os.IsNotExist(err) {
			h.logger.Warn("failed to rename thumbnail cache", "old", oldCache, "new", newCache, "err", err)
		}
	}

	pageCount := 0
	if images, err := cbz.ListImages(newPath); err == nil {
		pageCount = len(images)
	}

	h.logger.Info("comic renamed", "old", oldSlug, "new", newSlug)
	return c.JSON(http.StatusOK, map[string]any{"comic": Comic{Slug: newSlug, Name: newSlug, PageCount: pageCount}})
}

func (h *Handler) deleteComic(c echo.Context) error {
	slug := c.Param("slug")
	cbzPath, err := h.safeCBZPath(slug)
	if err != nil {
		h.logger.Warn("invalid delete request", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := os.Remove(cbzPath); err != nil {
		if os.IsNotExist(err) {
			return echo.NewHTTPError(http.StatusNotFound, "comic not found")
		}
		h.logger.Error("failed to delete comic file", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	decodedSlug := strings.TrimSuffix(filepath.Base(cbzPath), ".cbz")
	if err := h.store.DeleteComic(decodedSlug); err != nil {
		h.logger.Error("failed to delete comic metadata", "slug", decodedSlug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	if h.cfg.ThumbCachePath != "" {
		if err := os.Remove(filepath.Join(h.cfg.ThumbCachePath, decodedSlug+".jpg")); err != nil && !os.IsNotExist(err) {
			h.logger.Warn("failed to delete thumbnail cache", "slug", decodedSlug, "err", err)
		}
	}

	h.logger.Info("comic deleted", "slug", decodedSlug)
	return c.NoContent(http.StatusNoContent)
}
