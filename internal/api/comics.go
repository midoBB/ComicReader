package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/cbz"
)

type Comic struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	PageCount int    `json:"page_count"`
}

func (h *Handler) listComics(c echo.Context) error {
	entries, err := os.ReadDir(h.cfg.LibraryPath)
	if err != nil {
		h.logger.Error("failed to read library directory", "path", h.cfg.LibraryPath, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	var comics []Comic
	for _, entry := range entries {
		if entry.IsDir() || !strings.EqualFold(filepath.Ext(entry.Name()), ".cbz") {
			continue
		}
		name := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		slug := name
		cbzPath := filepath.Join(h.cfg.LibraryPath, entry.Name())
		images, err := cbz.ListImages(cbzPath)
		if err != nil {
			h.logger.Warn("skipping unreadable CBZ", "file", entry.Name(), "err", err)
			continue
		}
		comics = append(comics, Comic{
			Slug:      slug,
			Name:      name,
			PageCount: len(images),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"comics": comics})
}

func (h *Handler) getThumbnail(c echo.Context) error {
	slug := c.Param("slug")
	cbzPath, err := h.safeCBZPath(slug)
	if err != nil {
		h.logger.Warn("invalid thumbnail request", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	data, ct, err := cbz.Thumbnail(cbzPath)
	if err != nil {
		h.logger.Error("failed to read thumbnail", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.Blob(http.StatusOK, ct, data)
}
