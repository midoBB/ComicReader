package api

import (
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/facette/natsort"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/cbz"
	"github.com/midoBB/ComicReader/internal/store"
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

	sortParam := c.QueryParam("sort")
	if sortParam == "" {
		sortParam = "name"
	}
	directionParam := c.QueryParam("direction")
	if directionParam == "" {
		directionParam = "asc"
	}
	seedParam := c.QueryParam("seed")
	var seed int64
	if seedParam != "" {
		if s, err := strconv.ParseInt(seedParam, 10, 64); err == nil {
			seed = s
		}
	}

	filterParam := c.QueryParam("filter")
	searchQuery := c.QueryParam("query")

	entries, err := os.ReadDir(h.cfg.LibraryPath)
	if err != nil {
		h.logger.Error("failed to read library directory", "path", h.cfg.LibraryPath, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	var metaMap map[string]store.ComicMeta
	metaMap, err = h.store.GetAllMeta()
	if err != nil {
		h.logger.Warn("failed to fetch meta", "err", err)
		metaMap = make(map[string]store.ComicMeta)
	}

	type entry struct {
		name      string
		slug      string
		path      string
		pageCount int
		updatedAt string
	}

	var all []entry
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".cbz") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		slug := name

		if searchQuery != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(searchQuery)) {
			continue
		}

		m, exists := metaMap[slug]
		if filterParam != "" {
			if filterParam == "favorites" && (!exists || !m.IsFavorite) {
				continue
			}
			if filterParam == "new" && (exists && m.Opened) {
				continue
			}
		}

		all = append(all, entry{
			name:      name,
			slug:      slug,
			path:      filepath.Join(h.cfg.LibraryPath, e.Name()),
			pageCount: m.PageCount,
			updatedAt: m.UpdatedAt,
		})
	}

	if sortParam == "random" {
		rng := rand.New(rand.NewSource(seed))
		rng.Shuffle(len(all), func(i, j int) {
			all[i], all[j] = all[j], all[i]
		})
	} else {
		sort.Slice(all, func(i, j int) bool {
			a, b := i, j
			if directionParam == "desc" {
				a, b = j, i
			}
			switch sortParam {
			case "view_date":
				if all[a].updatedAt == all[b].updatedAt {
					return natsort.Compare(all[a].name, all[b].name)
				}
				return all[a].updatedAt < all[b].updatedAt
			case "page_count":
				if all[a].pageCount == all[b].pageCount {
					return natsort.Compare(all[a].name, all[b].name)
				}
				return all[a].pageCount < all[b].pageCount
			default: // "name"
				return natsort.Compare(all[a].name, all[b].name)
			}
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
		pc := e.pageCount
		if pc == 0 {
			images, err := cbz.ListImages(e.path)
			if err != nil {
				h.logger.Warn("skipping unreadable CBZ", "file", e.name, "err", err)
				continue
			}
			pc = len(images)
		}
		comics = append(comics, Comic{
			Slug:      e.slug,
			Name:      e.name,
			PageCount: pc,
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

	data, ct, etag, err := cbz.Thumbnail(cbzPath, h.cfg.ThumbCachePath)
	if err != nil {
		h.logger.Error("failed to read thumbnail", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	c.Response().Header().Set("Cache-Control", "public, max-age=86400, immutable")
	c.Response().Header().Set("ETag", etag)
	if c.Request().Header.Get("If-None-Match") == etag {
		return c.NoContent(http.StatusNotModified)
	}
	return c.Blob(http.StatusOK, ct, data)
}
