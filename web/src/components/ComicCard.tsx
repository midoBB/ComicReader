import { useNavigate } from 'react-router'
import { thumbnailUrl } from '../api/client'
import type { Comic, ComicMeta } from '../types/api'

interface Props {
  comic: Comic
  meta?: ComicMeta
  onToggleFavorite?: (fav: boolean) => void
}

export function ComicCard({ comic, meta, onToggleFavorite }: Props) {
  const navigate = useNavigate()
  const isFavorite = meta?.is_favorite ?? false
  const isNew = !(meta?.opened ?? false)
  const lastPage = meta?.last_page ?? 0
  const progress = comic.page_count > 0 ? lastPage / (comic.page_count - 1) : 0
  const hasProgress = lastPage > 0 && lastPage < comic.page_count - 1

  function handleClick() {
    navigate(`/read/${encodeURIComponent(comic.slug)}`)
  }

  function handleContinue(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/read/${encodeURIComponent(comic.slug)}?page=${lastPage}`)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        background: '#1e1e1e',
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'transform 0.15s',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={thumbnailUrl(comic.slug)}
          alt={comic.name}
          loading="lazy"
          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
        />
        {isNew && (
          <div style={{
            position: 'absolute', top: 6, left: 6,
            background: '#e53935', color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 6px', borderRadius: 3,
            pointerEvents: 'none',
          }}>NEW</div>
        )}
        {hasProgress && (
          <button
            onClick={handleContinue}
            title={`Continue from page ${lastPage + 1}`}
            className="comic-card-continue-overlay"
            style={{
              position: 'absolute', top: 6, left: 6,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              padding: '2px 6px', borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ▶ p{lastPage + 1}
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation()
            onToggleFavorite?.(!isFavorite)
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.55)', border: 'none',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
            color: isFavorite ? '#f5c542' : '#aaa',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        {hasProgress && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(0,0,0,0.4)',
          }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#4fc3f7',
            }} />
          </div>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {comic.name}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          {comic.page_count} pages
        </div>
        {hasProgress && (
          <button
            onClick={handleContinue}
            title={`Continue from page ${lastPage + 1}`}
            className="comic-card-continue-bottom"
            style={{
              marginTop: 6,
              width: '100%',
              background: '#1a3a4a',
              color: '#4fc3f7',
              border: '1px solid #2a5a6a',
              borderRadius: 4,
              padding: '6px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ▶ Continue — p{lastPage + 1}
          </button>
        )}
      </div>
      <style>{`
        .comic-card-continue-bottom { display: none; }
        @media (max-width: 767px) {
          .comic-card-continue-overlay { display: none !important; }
          .comic-card-continue-bottom { display: block; }
        }
      `}</style>
    </div>
  )
}
