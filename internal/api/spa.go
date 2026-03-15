package api

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
)

type SPAHandler struct {
	fsys fs.FS
}

func NewSPAHandler(fsys fs.FS) SPAHandler {
	return SPAHandler{fsys: fsys}
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
