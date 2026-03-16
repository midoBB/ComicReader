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

  // IntersectionObserver to trigger next page load
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  // Removed inline styles and instead using CSS classes from index.css

  if (error) return <div style={{ padding: 40, color: '#f55', textAlign: 'center' }}>{error}</div>

  return (
    <div>
      <div className="toolbar glass-panel">
        <button className={`btn-base ${filter === 'all' ? 'btn-active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`btn-base ${filter === 'favorites' ? 'btn-active' : ''}`} onClick={() => setFilter('favorites')}>Favorites</button>
        <button className={`btn-base ${filter === 'new' ? 'btn-active' : ''}`} onClick={() => setFilter('new')}>New</button>
        
        <select 
          value={sort} 
          onChange={e => setSort(e.target.value as Sort)}
          className="btn-base"
          style={{ padding: '6px 10px', background: '#1a1a1a' }}
        >
          <option value="name">Name</option>
          <option value="view_date">Last Viewed</option>
          <option value="page_count">Page Count</option>
          <option value="random">Random</option>
        </select>
        
        {sort !== 'random' && (
          <button
            className="btn-base btn-icon"
            onClick={() => setDirection(d => d === 'asc' ? 'desc' : 'asc')}
            title={direction === 'asc' ? 'Ascending' : 'Descending'}
          >
            {direction === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
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
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          {searchQuery.trim() !== ''
            ? `No comics match "${searchQuery}".`
            : filter === 'favorites'
              ? 'No favorites yet.'
              : filter === 'new'
                ? 'No new comics.'
                : 'No comics found.'}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
        padding: '12px 16px 32px',
      }}>
        {comics.map(c => (
          <ComicCard
            key={c.slug}
            comic={c}
            meta={meta[c.slug]}
            onToggleFavorite={(fav) => updateLocalFavorite(c.slug, fav)}
          />
        ))}
      </div>
      {loading && (
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading…</div>
      )}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {showScrollTop && (
        <button
          className="scroll-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  )
}
