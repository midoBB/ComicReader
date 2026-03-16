import { useEffect, useRef, useState } from 'react'
import { useAllMeta } from '../hooks/useAllMeta'
import { useComics } from '../hooks/useComics'
import { ComicCard } from './ComicCard'

type Filter = 'all' | 'favorites' | 'new'

export function ComicGrid() {
  const { meta, updateLocalFavorite } = useAllMeta()
  const [filter, setFilter] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { comics, hasMore, loading, error, loadMore, reset } = useComics(filter, debouncedQuery)

  useEffect(() => {
    reset()
    loadMore()
  }, [filter, debouncedQuery, reset, loadMore])

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

  const btnBase: React.CSSProperties = {
    background: 'none', border: '1px solid #555', color: '#ccc',
    padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 14,
    WebkitTapHighlightColor: 'transparent',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase, background: '#333', color: '#fff', borderColor: '#888',
  }

  if (error) return <div style={{ padding: 40, color: '#f55', textAlign: 'center' }}>{error}</div>

  return (
    <div>
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <button style={filter === 'all' ? btnActive : btnBase} onClick={() => setFilter('all')}>All</button>
        <button style={filter === 'favorites' ? btnActive : btnBase} onClick={() => setFilter('favorites')}>Favorites</button>
        <button style={filter === 'new' ? btnActive : btnBase} onClick={() => setFilter('new')}>New</button>
        <input
          type="search"
          placeholder="Search…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            marginLeft: 'auto',
            background: '#1a1a1a',
            border: '1px solid #555',
            borderRadius: 4,
            color: '#ccc',
            fontSize: 14,
            padding: '6px 10px',
            outline: 'none',
            minWidth: 0,
            width: 'clamp(120px, 30vw, 220px)',
          }}
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
    </div>
  )
}
