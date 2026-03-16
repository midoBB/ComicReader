package api

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
)

type SPAHandler struct {
	fsys    fs.FS
	version string
}

func NewSPAHandler(fsys fs.FS, version string) SPAHandler {
	return SPAHandler{fsys: fsys, version: version}
}

func isHashedAsset(path string) bool {
	base := filepath.Base(path)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)
	// Vite hashes assets as "name-[hash].ext" where hash is 8 hex chars
	if idx := strings.LastIndex(name, "-"); idx != -1 {
		hash := name[idx+1:]
		if len(hash) >= 8 {
			allHex := true
			for _, c := range hash {
				if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
					allHex = false
					break
				}
			}
			if allHex {
				return true
			}
		}
	}
	return false
}

func (s SPAHandler) serveFile(w http.ResponseWriter, r *http.Request, path string) {
	data, err := fs.ReadFile(s.fsys, path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	ct := mime.TypeByExtension(filepath.Ext(path))
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	if s.version != "dev" {
		if isHashedAsset(path) {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			etag := `"` + s.version + `"`
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("ETag", etag)
			if r.Header.Get("If-None-Match") == etag {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (s SPAHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		s.serveFile(w, r, "index.html")
		return
	}
	f, err := s.fsys.Open(path)
	if err == nil {
		stat, statErr := f.Stat()
		f.Close()
		if statErr == nil && !stat.IsDir() {
			s.serveFile(w, r, path)
			return
		}
	}
	// SPA fallback
	s.serveFile(w, r, "index.html")
}
