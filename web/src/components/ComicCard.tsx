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
      className="comic-card"
    >
      <div style={{ position: 'relative' }}>
        <img
          src={thumbnailUrl(comic.slug)}
          alt={comic.name}
          loading="lazy"
          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
        />
        {isNew && (
          <div className="badge-new">NEW</div>
        )}
        {hasProgress && (
          <button
            onClick={handleContinue}
            title={`Continue from page ${lastPage + 1}`}
            className="comic-card-continue-overlay"
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
          className={`btn-favorite ${isFavorite ? 'active' : ''}`}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        {hasProgress && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      <div style={{ padding: '12px 12px' }}>
        <div className="comic-title">
          {comic.name}
        </div>
        <div className="comic-pages">
          {comic.page_count} pages
        </div>
        {hasProgress && (
          <button
            onClick={handleContinue}
            title={`Continue from page ${lastPage + 1}`}
            className="comic-card-continue-bottom"
          >
            ▶ Continue — p{lastPage + 1}
          </button>
        )}
      </div>
    </div>
  )
}
