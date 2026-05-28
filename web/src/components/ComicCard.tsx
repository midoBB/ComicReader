import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { thumbnailUrl } from '../api/client'
import type { Comic, ComicMeta } from '../types/api'

interface Props {
  comic: Comic
  meta?: ComicMeta
  onToggleFavorite?: (fav: boolean) => void
  onRename?: () => void
  onDelete?: () => void
}

export function ComicCard({ comic, meta, onToggleFavorite, onRename, onDelete }: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
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
    <div onClick={handleClick} className="comic-card">
      <div className="comic-cover">
        <img
          src={thumbnailUrl(comic.slug)}
          alt={comic.name}
          loading="lazy"
        />
        <div className="comic-cover-overlay" />

        {isNew && <div className="badge-new">NEW</div>}

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
          onClick={e => { e.stopPropagation(); onToggleFavorite?.(!isFavorite) }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`btn-favorite${isFavorite ? ' active' : ''}`}
        >
          {isFavorite ? '★' : '☆'}
        </button>

        <div className="comic-menu-wrap" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(open => !open)}
            title="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="btn-overflow"
          >
            <MoreVertical size={17} />
          </button>
          {menuOpen && (
            <div className="comic-action-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onRename?.() }}
              >
                <Pencil size={14} />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => { setMenuOpen(false); onDelete?.() }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        {hasProgress && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      <div className="comic-info">
        <div className="comic-title">{comic.name}</div>
        <div className="comic-pages">{comic.page_count} pages</div>
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
