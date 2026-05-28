import { useEffect, useRef, useState } from 'react'
import { useQueryState, parseAsStringLiteral, parseAsString } from 'nuqs'
import { ArrowDownAZ, ArrowUpAZ, ArrowUp } from 'lucide-react'
import { toast } from 'sonner'
import { deleteComic as deleteComicApi, renameComic as renameComicApi } from '../api/client'
import { useAllMeta } from '../hooks/useAllMeta'
import { useComics } from '../hooks/useComics'
import { ComicCard } from './ComicCard'
import type { Comic } from '../types/api'

type Filter = 'all' | 'favorites' | 'new'
type Sort = 'name' | 'view_date' | 'page_count' | 'random'
type Direction = 'asc' | 'desc'

export function ComicGrid() {
  const { meta, updateLocalFavorite, renameLocalMeta, deleteLocalMeta } = useAllMeta()
  const [filter, setFilter] = useQueryState<Filter>(
    'filter',
    parseAsStringLiteral(['all', 'favorites', 'new'] as const).withDefault('all')
  )
  const [sort, setSort] = useQueryState<Sort>(
    'sort',
    parseAsStringLiteral(['name', 'view_date', 'page_count', 'random'] as const).withDefault('name')
  )
  const [direction, setDirection] = useQueryState<Direction>(
    'dir',
    parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc')
  )
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('')
  )
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Comic | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Comic | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { comics, hasMore, loading, error, loadMore, reset, renameLocalComic, deleteLocalComic } = useComics(filter, debouncedQuery, sort, direction)

  useEffect(() => {
    reset()
    loadMore()
  }, [filter, debouncedQuery, sort, direction, reset, loadMore])

  useEffect(() => {
    function onScroll() { setShowScrollTop(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  function openRename(comic: Comic) {
    setRenameTarget(comic)
    setRenameValue(comic.name)
  }

  async function confirmRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameTarget || actionPending) return
    const nextName = renameValue.trim()
    if (!nextName) {
      toast.error('Comic name is required')
      return
    }

    setActionPending(true)
    try {
      const res = await renameComicApi(renameTarget.slug, nextName)
      renameLocalComic(renameTarget.slug, res.comic)
      renameLocalMeta(renameTarget.slug, res.comic.slug)
      setRenameTarget(null)
      toast.success(`Renamed to ${res.comic.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename comic')
    } finally {
      setActionPending(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || actionPending) return
    setActionPending(true)
    try {
      await deleteComicApi(deleteTarget.slug)
      deleteLocalComic(deleteTarget.slug)
      deleteLocalMeta(deleteTarget.slug)
      setDeleteTarget(null)
      toast.success(`Deleted ${deleteTarget.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comic')
    } finally {
      setActionPending(false)
    }
  }

  if (error) return <div style={{ padding: 40, color: '#e05', textAlign: 'center' }}>{error}</div>

  return (
    <div>
      <div className="toolbar">
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn${filter === 'favorites' ? ' active' : ''}`} onClick={() => setFilter('favorites')}>Favorites</button>
        <button className={`filter-btn${filter === 'new' ? ' active' : ''}`} onClick={() => setFilter('new')}>New</button>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as Sort)}
          className="sort-select"
        >
          <option value="name">Name</option>
          <option value="view_date">Last Viewed</option>
          <option value="page_count">Page Count</option>
          <option value="random">Random</option>
        </select>

        {sort !== 'random' && (
          <button
            className="dir-btn"
            onClick={() => setDirection(d => d === 'asc' ? 'desc' : 'asc')}
            title={direction === 'asc' ? 'Ascending' : 'Descending'}
          >
            {direction === 'asc' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
          </button>
        )}

        <input
          type="search"
          placeholder="Search…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {comics.length === 0 && !loading && (
        <div className="empty-state">
          {searchQuery.trim() !== ''
            ? `No results for "${searchQuery}"`
            : filter === 'favorites'
              ? 'No favorites yet.'
              : filter === 'new'
                ? 'No new comics.'
                : 'No comics found.'}
        </div>
      )}

      <div className="comic-grid">
        {comics.map(c => (
          <ComicCard
            key={c.slug}
            comic={c}
            meta={meta[c.slug]}
            onToggleFavorite={fav => updateLocalFavorite(c.slug, fav)}
            onRename={() => openRename(c)}
            onDelete={() => setDeleteTarget(c)}
          />
        ))}
      </div>

      {loading && <div className="loading-text">Loading…</div>}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {showScrollTop && (
        <button
          className="scroll-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
        >
          <ArrowUp size={16} />
        </button>
      )}

      {renameTarget && (
        <div className="dialog-backdrop" onClick={() => !actionPending && setRenameTarget(null)}>
          <form className="dialog-panel" onSubmit={confirmRename} onClick={e => e.stopPropagation()}>
            <div className="dialog-title">Rename comic</div>
            <input
              autoFocus
              className="dialog-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              disabled={actionPending}
            />
            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={() => setRenameTarget(null)} disabled={actionPending}>
                Cancel
              </button>
              <button type="submit" className="dialog-btn primary" disabled={actionPending || renameValue.trim() === ''}>
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="dialog-backdrop" onClick={() => !actionPending && setDeleteTarget(null)}>
          <div className="dialog-panel" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="dialog-title">Delete comic</div>
            <div className="dialog-copy">
              Delete "{deleteTarget.name}" permanently from the library?
            </div>
            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={() => setDeleteTarget(null)} disabled={actionPending}>
                Cancel
              </button>
              <button type="button" className="dialog-btn danger" onClick={confirmDelete} disabled={actionPending}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
