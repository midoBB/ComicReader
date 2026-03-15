package api

import (
	"net/http"
	"net/url"

	"github.com/labstack/echo/v4"
)

func (h *Handler) getAllMeta(c echo.Context) error {
	meta, err := h.store.GetAllMeta()
	if err != nil {
		h.logger.Error("failed to get all meta", "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]any{"meta": meta})
}

func (h *Handler) getComicMeta(c echo.Context) error {
	slug, err := url.PathUnescape(c.Param("slug"))
	if err != nil {
		h.logger.Warn("invalid slug in getComicMeta", "raw", c.Param("slug"), "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, "invalid slug")
	}
	m, err := h.store.GetMeta(slug)
	if err != nil {
		h.logger.Error("failed to get meta", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, m)
}

func (h *Handler) setFavorite(c echo.Context) error {
	slug, err := url.PathUnescape(c.Param("slug"))
	if err != nil {
		h.logger.Warn("invalid slug in setFavorite", "raw", c.Param("slug"), "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, "invalid slug")
	}
	var body struct {
		Favorite bool `json:"favorite"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if err := h.store.SetFavorite(slug, body.Favorite); err != nil {
		h.logger.Error("failed to set favorite", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	h.logger.Info("favorite updated", "slug", slug, "favorite", body.Favorite)
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) markOpened(c echo.Context) error {
	slug, err := url.PathUnescape(c.Param("slug"))
	if err != nil {
		h.logger.Warn("invalid slug in markOpened", "raw", c.Param("slug"), "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, "invalid slug")
	}
	if err := h.store.SetOpened(slug); err != nil {
		h.logger.Error("failed to mark opened", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	h.logger.Info("comic opened", "slug", slug)
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) setProgress(c echo.Context) error {
	slug, err := url.PathUnescape(c.Param("slug"))
	if err != nil {
		h.logger.Warn("invalid slug in setProgress", "raw", c.Param("slug"), "err", err)
		return echo.NewHTTPError(http.StatusBadRequest, "invalid slug")
	}
	var body struct {
		Page int `json:"page"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if body.Page < 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "page must be >= 0")
	}
	if err := h.store.SetLastPage(slug, body.Page); err != nil {
		h.logger.Error("failed to set progress", "slug", slug, "err", err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
