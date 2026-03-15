package cbz

import (
	"archive/zip"
	"bytes"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	_ "image/gif"
	_ "image/png"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/facette/natsort"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

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

// Thumbnail returns a resized JPEG thumbnail for the first page of a CBZ,
// using a disk cache at cachePath/<slug>.jpg.
func Thumbnail(cbzPath, cachePath string) ([]byte, string, error) {
	slug := strings.TrimSuffix(filepath.Base(cbzPath), filepath.Ext(cbzPath))
	cacheFile := filepath.Join(cachePath, slug+".jpg")

	if data, err := os.ReadFile(cacheFile); err == nil {
		return data, "image/jpeg", nil
	}

	pr, err := OpenPage(cbzPath, 0)
	if err != nil {
		return nil, "", err
	}
	defer pr.RC.Close()

	src, _, err := image.Decode(pr.RC)
	if err != nil {
		return nil, "", fmt.Errorf("decode image: %w", err)
	}

	const maxWidth = 280
	bounds := src.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()
	if w > maxWidth {
		h = h * maxWidth / w
		w = maxWidth
	}

	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 80}); err != nil {
		return nil, "", fmt.Errorf("encode jpeg: %w", err)
	}

	if err := os.MkdirAll(cachePath, 0o755); err == nil {
		os.WriteFile(cacheFile, buf.Bytes(), 0o644)
	}

	return buf.Bytes(), "image/jpeg", nil
}
