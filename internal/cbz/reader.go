package cbz

import (
	"archive/zip"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strings"
	"sync"

	"github.com/facette/natsort"
)

var thumbnailCache sync.Map

var imageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true,
	".gif": true, ".webp": true, ".avif": true,
}

func isImage(name string) bool {
	return imageExts[strings.ToLower(filepath.Ext(name))]
}

// ListImages returns sorted image filenames from a CBZ.
func ListImages(cbzPath string) ([]string, error) {
	r, err := zip.OpenReader(cbzPath)
	if err != nil {
		return nil, err
	}
	defer r.Close()

	var names []string
	for _, f := range r.File {
		if isImage(f.Name) {
			names = append(names, f.Name)
		}
	}
	natsort.Sort(names)
	return names, nil
}

type PageResult struct {
	RC          io.ReadCloser
	ContentType string
	Size        int64
}

type zipPageReader struct {
	rc     io.ReadCloser
	zipRdr *zip.ReadCloser
}

func (z *zipPageReader) Read(p []byte) (int, error) { return z.rc.Read(p) }
func (z *zipPageReader) Close() error {
	err := z.rc.Close()
	z.zipRdr.Close()
	return err
}

// OpenPage returns an io.ReadCloser for the page at pageIdx (zero-based).
func OpenPage(cbzPath string, pageIdx int) (*PageResult, error) {
	r, err := zip.OpenReader(cbzPath)
	if err != nil {
		return nil, err
	}

	var names []string
	for _, f := range r.File {
		if isImage(f.Name) {
			names = append(names, f.Name)
		}
	}
	natsort.Sort(names)

	if pageIdx < 0 || pageIdx >= len(names) {
		r.Close()
		return nil, fmt.Errorf("page index %d out of range (0-%d)", pageIdx, len(names)-1)
	}

	target := names[pageIdx]
	for _, f := range r.File {
		if f.Name != target {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			r.Close()
			return nil, err
		}
		ct := mime.TypeByExtension(filepath.Ext(f.Name))
		if ct == "" {
			ct = "application/octet-stream"
		}
		return &PageResult{
			RC:          &zipPageReader{rc: rc, zipRdr: r},
			ContentType: ct,
			Size:        int64(f.UncompressedSize64),
		}, nil
	}

	r.Close()
	return nil, fmt.Errorf("file not found in archive")
}

// Thumbnail returns the raw bytes of the first image, cached after first call.
func Thumbnail(cbzPath string) ([]byte, string, error) {
	if v, ok := thumbnailCache.Load(cbzPath); ok {
		entry := v.([2]interface{})
		return entry[0].([]byte), entry[1].(string), nil
	}

	pr, err := OpenPage(cbzPath, 0)
	if err != nil {
		return nil, "", err
	}
	defer pr.RC.Close()

	data, err := io.ReadAll(pr.RC)
	if err != nil {
		return nil, "", err
	}

	thumbnailCache.Store(cbzPath, [2]interface{}{data, pr.ContentType})
	return data, pr.ContentType, nil
}
