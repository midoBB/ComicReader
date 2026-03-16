import { useEffect, useRef, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, ArrowUp } from 'lucide-react'
import { useAllMeta } from '../hooks/useAllMeta'
import { useComics } from '../hooks/useComics'
import { ComicCard } from './ComicCard'

type Filter = 'all' | 'favorites' | 'new'
type Sort = 'name' | 'view_date' | 'page_count' | 'random'
type Direction = 'asc' | 'desc'

export function ComicGrid() {
  const { meta, updateLocalFavorite } = useAllMeta()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [direction, setDirection] = useState<Direction>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { comics, hasMore, loading, error, loadMore, reset } = useComics(filter, debouncedQuery, sort, direction)

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
    </div>
  )
}
