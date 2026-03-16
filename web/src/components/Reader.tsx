import { Heart, Maximize, Minimize } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { markOpened, pageUrl, setProgress } from '../api/client'
import { useAllMeta } from '../hooks/useAllMeta'
import { useComic } from '../hooks/useComic'
import { useSettings } from '../hooks/useSettings'
import { LazyImage } from './LazyImage'
import { SettingsPanel } from './SettingsPanel'

const MOBILE_QUERY = '(hover: none) and (pointer: coarse)'

export function Reader() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data, loading, error } = useComic(slug ?? '')
  const { settings, updateSettings } = useSettings()
  const { meta, updateLocalFavorite } = useAllMeta()
  const [showSettings, setShowSettings] = useState(false)
  const [showTopbar, setShowTopbar] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [currentPage, setCurrentPage] = useState(0)
  const startPage = parseInt(searchParams.get('page') ?? '0', 10) || 0
  const pageRefs = useRef<(HTMLImageElement | HTMLDivElement | null)[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrolledToStart = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    function onFullscreenChange() {
      const entering = !!document.fullscreenElement
      setIsFullscreen(entering)
      if (isMobile) setShowTopbar(!entering)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [isMobile])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    if (slug) {
      markOpened(slug)
      pageRefs.current = []
      scrolledToStart.current = false
    }
  }, [slug])

  // Scroll to startPage once pages are rendered
  useEffect(() => {
    if (!data || scrolledToStart.current || startPage === 0) return
    const el = pageRefs.current[startPage]
    if (el) {
      el.scrollIntoView({ block: 'start' })
      scrolledToStart.current = true
    }
  })

  // Save progress + update page counter on scroll with 1s debounce
  useEffect(() => {
    if (!slug || !data) return

    function handleScroll() {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const viewportMid = window.scrollY + window.innerHeight / 2
        let page = 0
        for (let i = 0; i < pageRefs.current.length; i++) {
          const el = pageRefs.current[i]
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const absTop = rect.top + window.scrollY
          if (absTop <= viewportMid) {
            page = i
          } else {
            break
          }
        }
        setCurrentPage(page)
        setProgress(slug!, page)
      }, 1000)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [slug, data])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
  if (error) return <div style={{ padding: 40, color: '#f55', textAlign: 'center' }}>{error}</div>
  if (!data) return null

  const isFavorite = meta[data.slug]?.is_favorite ?? false
  const maxWidth = settings.readerWidth === 'constrained' ? 'min(100%, 900px)' : '100%'
  const pages = data.pages.map((_, idx) => idx)
  const totalPages = data.pages.length

  function renderPages() {
    if (!settings.spreadView) {
      return pages.map(idx => (
        <LazyImage
          key={idx}
          ref={el => { pageRefs.current[idx] = el }}
          src={pageUrl(data!.slug, idx)}
          alt={`Page ${idx + 1}`}
          style={{ width: '100%', maxWidth }}
          imgStyle={{ width: '100%', display: 'block' }}
        />
      ))
    }

    const pairs: number[][] = []
    for (let i = 0; i < pages.length; i += 2) {
      pairs.push(pages.slice(i, i + 2))
    }
    const rtl = settings.spreadDirection === 'rtl'
    return pairs.map(pair => {
      const displayPair = rtl ? [...pair].reverse() : pair
      return (
        <div
          key={pair[0]}
          ref={el => { pageRefs.current[pair[0]] = el }}
          style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth, gap: 0 }}
        >
          {displayPair.map(idx => (
            <LazyImage
              key={idx}
              src={pageUrl(data!.slug, idx)}
              alt={`Page ${idx + 1}`}
              style={{ width: `${100 / pair.length}%` }}
              imgStyle={{ width: '100%', display: 'block' }}
            />
          ))}
        </div>
      )
    })
  }

  return (
    <div style={{ background: '#111', minHeight: '100vh' }}>
      <style>{`
        @media not ${MOBILE_QUERY} {
          .reader-mobile-only { display: none !important; }
        }
      `}</style>

      {/* Topbar hide-hint pill — only visible on mobile when topbar is hidden */}
      {isMobile && !showTopbar && (
        <div
          className="reader-topbar-hint"
          onClick={() => setShowTopbar(true)}
          title="Show controls"
        />
      )}

      <div className={`reader-topbar${isMobile && !showTopbar ? ' hidden' : ''}`}>
        <button
          type="button"
          className="reader-btn reader-btn-back"
          onClick={() => navigate('/')}
        >
          ←
        </button>
        <span style={{
          fontWeight: 600, fontSize: 15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0, flex: 1,
        }}>
          {data.name}
        </span>
        <span className="reader-page-counter">
          {currentPage + 1} / {totalPages}
        </span>

        <button
          type="button"
          className="reader-btn reader-btn-icon reader-mobile-only"
          onClick={() => updateLocalFavorite(data.slug, !isFavorite)}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{ color: isFavorite ? '#e05' : undefined, borderColor: isFavorite ? '#e05' : undefined }}
        >
          <Heart size={16} fill={isFavorite ? '#e05' : 'none'} />
        </button>

        <button
          type="button"
          className="reader-btn reader-btn-icon reader-mobile-only"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            className="reader-btn reader-btn-icon"
            onClick={() => setShowSettings(v => !v)}
            title="Settings"
            style={{ fontSize: 16, padding: '6px 10px' }}
          >
            ⚙
          </button>
          {showSettings && (
            <SettingsPanel
              settings={settings}
              onChange={updateSettings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>

      <div
        onClick={isMobile ? () => setShowTopbar(v => !v) : undefined}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2, paddingBottom: 40,
        }}
      >
        {renderPages()}
      </div>
    </div>
  )
}
