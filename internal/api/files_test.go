package api

import (
	"archive/zip"
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/midoBB/ComicReader/internal/config"
	"github.com/midoBB/ComicReader/internal/store"
)

func testServer(t *testing.T) (*echo.Echo, *store.Store, string, string) {
	t.Helper()

	root := t.TempDir()
	libraryPath := filepath.Join(root, "library")
	cachePath := filepath.Join(root, "thumbs")
	if err := os.MkdirAll(libraryPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(cachePath, 0o755); err != nil {
		t.Fatal(err)
	}

	s, err := store.Open(filepath.Join(root, "data.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })

	e := echo.New()
	h := NewHandler(&config.Config{
		LibraryPath:    libraryPath,
		ThumbCachePath: cachePath,
	}, s, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h.RegisterRoutes(e)

	return e, s, libraryPath, cachePath
}

func writeCBZ(t *testing.T, path string) {
	t.Helper()

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("001.jpg")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := w.Write([]byte("not a real jpeg")); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
}

func perform(e *echo.Echo, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func TestRenameComicPreservesMetadataAndCache(t *testing.T) {
	e, s, libraryPath, cachePath := testServer(t)
	writeCBZ(t, filepath.Join(libraryPath, "Old Name.cbz"))
	if _, _, err := s.SyncLibrary(libraryPath, cachePath); err != nil {
		t.Fatal(err)
	}
	if err := s.SetFavorite("Old Name", true); err != nil {
		t.Fatal(err)
	}
	if err := s.SetLastPage("Old Name", 7); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cachePath, "Old Name.jpg"), []byte("thumb"), 0o644); err != nil {
		t.Fatal(err)
	}

	rec := perform(e, http.MethodPut, "/api/comics/Old%20Name/rename", `{"name":"New Name"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	if _, err := os.Stat(filepath.Join(libraryPath, "Old Name.cbz")); !os.IsNotExist(err) {
		t.Fatalf("old file still exists or stat failed unexpectedly: %v", err)
	}
	if _, err := os.Stat(filepath.Join(libraryPath, "New Name.cbz")); err != nil {
		t.Fatalf("new file missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(cachePath, "New Name.jpg")); err != nil {
		t.Fatalf("new cache missing: %v", err)
	}

	meta, err := s.GetMeta("New Name")
	if err != nil {
		t.Fatal(err)
	}
	if !meta.IsFavorite || !meta.Opened || meta.LastPage != 7 {
		t.Fatalf("metadata not preserved: %+v", meta)
	}
}

func TestRenameComicRejectsConflictsAndInvalidNames(t *testing.T) {
	e, s, libraryPath, cachePath := testServer(t)
	writeCBZ(t, filepath.Join(libraryPath, "One.cbz"))
	writeCBZ(t, filepath.Join(libraryPath, "Two.cbz"))
	if _, _, err := s.SyncLibrary(libraryPath, cachePath); err != nil {
		t.Fatal(err)
	}

	rec := perform(e, http.MethodPut, "/api/comics/One/rename", `{"name":"Two"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("conflict status = %d, body = %s", rec.Code, rec.Body.String())
	}

	rec = perform(e, http.MethodPut, "/api/comics/One/rename", `{"name":"../Bad"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteComicRemovesFileMetadataAndCache(t *testing.T) {
	e, s, libraryPath, cachePath := testServer(t)
	writeCBZ(t, filepath.Join(libraryPath, "Delete Me.cbz"))
	if _, _, err := s.SyncLibrary(libraryPath, cachePath); err != nil {
		t.Fatal(err)
	}
	if err := s.SetFavorite("Delete Me", true); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(cachePath, "Delete Me.jpg"), []byte("thumb"), 0o644); err != nil {
		t.Fatal(err)
	}

	rec := perform(e, http.MethodDelete, "/api/comics/Delete%20Me", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	if _, err := os.Stat(filepath.Join(libraryPath, "Delete Me.cbz")); !os.IsNotExist(err) {
		t.Fatalf("comic file still exists or stat failed unexpectedly: %v", err)
	}
	if _, err := os.Stat(filepath.Join(cachePath, "Delete Me.jpg")); !os.IsNotExist(err) {
		t.Fatalf("cache file still exists or stat failed unexpectedly: %v", err)
	}
	meta, err := s.GetAllMeta()
	if err != nil {
		t.Fatal(err)
	}
	if _, exists := meta["Delete Me"]; exists {
		t.Fatal("deleted metadata row still exists")
	}
}

func TestDeleteComicMissingSource(t *testing.T) {
	e, _, _, _ := testServer(t)

	rec := perform(e, http.MethodDelete, "/api/comics/Missing", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
