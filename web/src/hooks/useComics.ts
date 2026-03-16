import { useCallback, useRef, useState } from 'react'
import { fetchComics } from '../api/client'
import type { Comic } from '../types/api'

const PAGE_SIZE = 24

export function useComics(filter: string = 'all', query: string = '') {
  const [comics, setComics] = useState<Comic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const argsRef = useRef({ page, filter, query })
  argsRef.current = { page, filter, query }

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const { page: currPage, filter: currFilter, query: currQuery } = argsRef.current
    const nextPage = currPage + 1
    try {
      const data = await fetchComics(nextPage, PAGE_SIZE, currFilter, currQuery)
      setComics(prev => [...prev, ...(data.comics ?? [])])
      setTotal(data.total)
      setPage(nextPage)
      argsRef.current.page = nextPage
    } catch (e) {
      setError(String(e))
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setComics([])
    setTotal(0)
    setPage(0)
    setError(null)
    loadingRef.current = false
    argsRef.current.page = 0
  }, [])

  return { comics, total, hasMore: comics.length < total || page === 0, loading, error, loadMore, reset }
}
