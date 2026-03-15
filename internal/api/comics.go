package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/cbz"
)

type Comic struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	PageCount int    `json:"page_count"`
}

type ComicListResponse struct {
	Comics   []Comic `json:"comics"`
	Total    int     `json:"total"`
	Page     int     `json:"page"`
	PageSize int     `json:"page_size"`
}

func (h *Handler) listComics(c echo.Context) error {
	page := 1
	pageSize := 24

	if v := c.QueryParam("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := c.QueryParam("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			pageSize = n
		}
	}

	entries, err := os.ReadDir(h.cfg.LibraryPath)
	if err != nil {
		h.logger.Error("failed to read library directory", "path", h.cfg.LibraryPath, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	type entry struct {
		name string
		slug string
		path string
	}

	var all []entry
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".cbz") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		all = append(all, entry{
			name: name,
			slug: name,
			path: filepath.Join(h.cfg.LibraryPath, e.Name()),
		})
	}

	total := len(all)

	start := (page - 1) * pageSize
	if start >= total {
		return c.JSON(http.StatusOK, ComicListResponse{
			Comics:   []Comic{},
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		})
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	slice := all[start:end]

	var comics []Comic
	for _, e := range slice {
		images, err := cbz.ListImages(e.path)
		if err != nil {
			h.logger.Warn("skipping unreadable CBZ", "file", e.name, "err", err)
			continue
		}
		comics = append(comics, Comic{
			Slug:      e.slug,
			Name:      e.name,
			PageCount: len(images),
		})
	}

	return c.JSON(http.StatusOK, ComicListResponse{
		Comics:   comics,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *Handler) getThumbnail(c echo.Context) error {
	slug := c.Param("slug")
	cbzPath, err := h.safeCBZPath(slug)
	if err != nil {
		h.logger.Warn("invalid thumbnail request", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	data, ct, err := cbz.Thumbnail(cbzPath, h.cfg.ThumbCachePath)
	if err != nil {
		h.logger.Error("failed to read thumbnail", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.Blob(http.StatusOK, ct, data)
}
