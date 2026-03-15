import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { markOpened, pageUrl, setProgress } from '../api/client'
import { useComic } from '../hooks/useComic'
import { useSettings } from '../hooks/useSettings'
import { LazyImage } from './LazyImage'
import { SettingsPanel } from './SettingsPanel'

export function Reader() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data, loading, error } = useComic(slug ?? '')
  const { settings, updateSettings } = useSettings()
  const [showSettings, setShowSettings] = useState(false)
  const startPage = parseInt(searchParams.get('page') ?? '0', 10) || 0
  const pageRefs = useRef<(HTMLImageElement | HTMLDivElement | null)[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrolledToStart = useRef(false)

  useEffect(() => {
    if (slug) markOpened(slug)
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

  // Save progress on scroll with 1s debounce
  useEffect(() => {
    if (!slug || !data) return

    function handleScroll() {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        // Find the first page element whose bottom is below the viewport top
        const viewportMid = window.scrollY + window.innerHeight / 2
        let currentPage = 0
        for (let i = 0; i < pageRefs.current.length; i++) {
          const el = pageRefs.current[i]
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const absTop = rect.top + window.scrollY
          if (absTop <= viewportMid) {
            currentPage = i
          } else {
            break
          }
        }
        setProgress(slug!, currentPage)
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

  const maxWidth = settings.readerWidth === 'constrained' ? 'min(100%, 900px)' : '100%'

  // Build page list — spread view pairs up pages (0+1, 2+3, …)
  const pages = data.pages.map((_, idx) => idx)

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

    // Pair pages for spread view
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
      <div style={{
        position: 'sticky', top: 0, background: '#1a1a1a', padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8, zIndex: 10,
        borderBottom: '1px solid #333',
        minWidth: 0,
      }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: '1px solid #555', color: '#ccc',
            padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            flexShrink: 0, WebkitTapHighlightColor: 'transparent',
          }}
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
        <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>{data.pages.length}p</span>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowSettings(v => !v)}
            title="Settings"
            style={{
              background: 'none', border: '1px solid #555', color: '#ccc',
              padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 16,
              WebkitTapHighlightColor: 'transparent',
            }}
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

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2, paddingBottom: 40,
      }}>
        {renderPages()}
      </div>
    </div>
  )
}
