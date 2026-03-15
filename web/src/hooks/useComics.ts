import { useCallback, useRef, useState } from 'react'
import { fetchComics } from '../api/client'
import type { Comic } from '../types/api'

const PAGE_SIZE = 24

export function useComics() {
  const [comics, setComics] = useState<Comic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const nextPage = page + 1
    try {
      const data = await fetchComics(nextPage, PAGE_SIZE)
      setComics(prev => [...prev, ...(data.comics ?? [])])
      setTotal(data.total)
      setPage(nextPage)
    } catch (e) {
      setError(String(e))
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [page])

  const reset = useCallback(() => {
    setComics([])
    setTotal(0)
    setPage(0)
    setError(null)
  }, [])

  return { comics, total, hasMore: comics.length < total || page === 0, loading, error, loadMore, reset }
}
