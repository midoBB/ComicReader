package store

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/midoBB/ComicReader/internal/cbz"
	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS comic_meta (
    slug        TEXT PRIMARY KEY,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    opened      INTEGER NOT NULL DEFAULT 0,
    last_page   INTEGER NOT NULL DEFAULT 0,
    page_count  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);`

type ComicMeta struct {
	Slug       string `json:"slug"`
	IsFavorite bool   `json:"is_favorite"`
	Opened     bool   `json:"opened"`
	LastPage   int    `json:"last_page"`
	PageCount  int    `json:"page_count"`
	UpdatedAt  string `json:"updated_at"`
}

type Store struct {
	db *sql.DB
}

func Open(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath+"?_pragma=busy_timeout=5000&_pragma=journal_mode=WAL")
	if err != nil {
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	migrate(db)
	return &Store{db: db}, nil
}

func migrate(db *sql.DB) {
	db.Exec(`ALTER TABLE comic_meta ADD COLUMN opened INTEGER NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE comic_meta ADD COLUMN last_page INTEGER NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE comic_meta ADD COLUMN page_count INTEGER NOT NULL DEFAULT 0`)
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) GetMeta(slug string) (ComicMeta, error) {
	s.ensureSlug(slug)
	row := s.db.QueryRow(
		`SELECT slug, is_favorite, opened, last_page, page_count, updated_at FROM comic_meta WHERE slug = ?`, slug)
	var m ComicMeta
	var openedInt int
	if err := row.Scan(&m.Slug, &m.IsFavorite, &openedInt, &m.LastPage, &m.PageCount, &m.UpdatedAt); err != nil {
		return ComicMeta{Slug: slug}, err
	}
	m.Opened = openedInt == 1
	return m, nil
}

func (s *Store) GetAllMeta() (map[string]ComicMeta, error) {
	rows, err := s.db.Query(`SELECT slug, is_favorite, opened, last_page, page_count, updated_at FROM comic_meta`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]ComicMeta)
	for rows.Next() {
		var m ComicMeta
		var openedInt int
		if err := rows.Scan(&m.Slug, &m.IsFavorite, &openedInt, &m.LastPage, &m.PageCount, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Opened = openedInt == 1
		result[m.Slug] = m
	}
	return result, rows.Err()
}

func (s *Store) SetFavorite(slug string, fav bool) error {
	favInt := 0
	if fav {
		favInt = 1
	}
	_, err := s.db.Exec(
		`INSERT INTO comic_meta (slug, is_favorite, updated_at)
		 VALUES (?, ?, ?)
		 ON CONFLICT(slug) DO UPDATE SET is_favorite = excluded.is_favorite, updated_at = excluded.updated_at`,
		slug, favInt, time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

func (s *Store) SetLastPage(slug string, page int) error {
	_, err := s.db.Exec(
		`INSERT INTO comic_meta (slug, last_page, opened, updated_at)
		 VALUES (?, ?, 1, ?)
		 ON CONFLICT(slug) DO UPDATE SET last_page = excluded.last_page, opened = 1, updated_at = excluded.updated_at`,
		slug, page, time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

func (s *Store) SetOpened(slug string) error {
	_, err := s.db.Exec(
		`INSERT INTO comic_meta (slug, opened, updated_at)
		 VALUES (?, 1, ?)
		 ON CONFLICT(slug) DO UPDATE SET opened = 1, updated_at = excluded.updated_at`,
		slug, time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

// SyncLibrary inserts rows for CBZ files found in libraryPath and deletes rows
// for slugs that no longer exist on disk. Preserves all existing metadata.
// Also removes cached thumbnails from thumbCachePath for deleted slugs.
// Returns the number of slugs added and removed.
func (s *Store) SyncLibrary(libraryPath, thumbCachePath string) (added, removed int, err error) {
	entries, err := os.ReadDir(libraryPath)
	if err != nil {
		return 0, 0, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	onDisk := make(map[string]struct{})
	for _, entry := range entries {
		if entry.IsDir() || !strings.EqualFold(filepath.Ext(entry.Name()), ".cbz") {
			continue
		}
		slug := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		onDisk[slug] = struct{}{}

		res, execErr := tx.Exec(`INSERT OR IGNORE INTO comic_meta (slug) VALUES (?)`, slug)
		if execErr == nil {
			if n, _ := res.RowsAffected(); n > 0 {
				added++
			}
		}
	}

	rows, err := tx.Query(`SELECT slug FROM comic_meta`)
	if err != nil {
		return added, 0, err
	}
	var stale []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return added, 0, err
		}
		if _, found := onDisk[slug]; !found {
			stale = append(stale, slug)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return added, 0, err
	}

	for _, slug := range stale {
		tx.Exec(`DELETE FROM comic_meta WHERE slug = ?`, slug)
		if thumbCachePath != "" {
			os.Remove(filepath.Join(thumbCachePath, slug+".jpg"))
		}
		removed++
	}
	
	if err := tx.Commit(); err != nil {
		return added, removed, err
	}

	// Backfill page_count for rows that still have 0 (new inserts and
	// pre-migration rows from an already-deployed DB). Runs in background
	// so it doesn't block the HTTP server on startup.
	go s.backfillPageCounts(libraryPath)

	return added, removed, nil
}

// backfillPageCounts populates page_count for any row where it is 0.
// Safe to call concurrently — each UPDATE is independent.
func (s *Store) backfillPageCounts(libraryPath string) {
	rows, err := s.db.Query(`SELECT slug FROM comic_meta WHERE page_count = 0`)
	if err != nil {
		return
	}
	var slugs []string
	for rows.Next() {
		var slug string
		if rows.Scan(&slug) == nil {
			slugs = append(slugs, slug)
		}
	}
	rows.Close()
	if rows.Err() != nil {
		return
	}

	for _, slug := range slugs {
		images, err := cbz.ListImages(filepath.Join(libraryPath, slug+".cbz"))
		if err != nil || len(images) == 0 {
			continue
		}
		s.db.Exec(`UPDATE comic_meta SET page_count = ? WHERE slug = ?`, len(images), slug)
	}
}

// ensureSlug inserts a default row if absent (best-effort, ignore error).
func (s *Store) ensureSlug(slug string) {
	s.db.Exec(`INSERT OR IGNORE INTO comic_meta (slug) VALUES (?)`, slug)
}
