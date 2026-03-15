package api

import (
	"log/slog"
	"time"

	"github.com/labstack/echo/v4"
)

// RequestLogger returns middleware that logs each request with method, path,
// status, and latency. Image serving (pages, thumbnails) is logged at DEBUG
// to avoid noise.
func RequestLogger(logger *slog.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			latency := time.Since(start)

			req := c.Request()
			res := c.Response()
			path := req.URL.Path
			status := res.Status

			attrs := []any{
				"method", req.Method,
				"path", path,
				"status", status,
				"latency", latency.Round(time.Millisecond).String(),
			}

			switch {
			case err != nil || status >= 500:
				logger.Error("request", attrs...)
			case status >= 400:
				logger.Warn("request", attrs...)
			default:
				logger.Debug("request", attrs...)
			}

			return err
		}
	}
}
