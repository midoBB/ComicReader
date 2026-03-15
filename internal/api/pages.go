package api

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/cbz"
)

func (h *Handler) listPages(c echo.Context) error {
	slug := c.Param("slug")
	cbzPath, err := h.safeCBZPath(slug)
	if err != nil {
		h.logger.Warn("invalid pages request", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	images, err := cbz.ListImages(cbzPath)
	if err != nil {
		h.logger.Error("failed to list pages", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	name := strings.TrimSuffix(filepath.Base(cbzPath), ".cbz")

	pages := make([]string, len(images))
	for i := range images {
		pages[i] = strconv.Itoa(i)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"slug":  name,
		"name":  name,
		"pages": pages,
	})
}

func (h *Handler) getPage(c echo.Context) error {
	slug := c.Param("slug")
	cbzPath, err := h.safeCBZPath(slug)
	if err != nil {
		h.logger.Warn("invalid page request", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	pageStr := c.Param("page")
	pageIdx, err := strconv.Atoi(pageStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid page index")
	}

	pr, err := cbz.OpenPage(cbzPath, pageIdx)
	if err != nil {
		h.logger.Error("failed to open page", "slug", slug, "page", pageIdx, "err", err)
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	defer pr.RC.Close()

	c.Response().Header().Set("Content-Type", pr.ContentType)
	if pr.Size > 0 {
		c.Response().Header().Set("Content-Length", strconv.FormatInt(pr.Size, 10))
	}
	return c.Stream(http.StatusOK, pr.ContentType, pr.RC)
}
