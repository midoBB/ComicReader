import { useCallback, useRef, useState } from 'react'
import { fetchComics } from '../api/client'
import type { Comic } from '../types/api'

const PAGE_SIZE = 24

export function useComics(filter: string = 'all', query: string = '', sort: string = 'name', direction: string = 'asc') {
  const [comics, setComics] = useState<Comic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [seed, setSeed] = useState(() => Date.now().toString())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const argsRef = useRef({ page, filter, query, sort, direction, seed })
  argsRef.current = { page, filter, query, sort, direction, seed }

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const { page: currPage, filter: currFilter, query: currQuery, sort: currSort, direction: currDirection, seed: currSeed } = argsRef.current
    const nextPage = currPage + 1
    try {
      const data = await fetchComics(nextPage, PAGE_SIZE, currFilter, currQuery, currSort, currDirection, currSeed)
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
    setSeed(Date.now().toString())
  }, [])

  const renameLocalComic = useCallback((oldSlug: string, comic: Comic) => {
    setComics(prev => prev.map(c => c.slug === oldSlug ? comic : c))
  }, [])

  const deleteLocalComic = useCallback((slug: string) => {
    setComics(prev => prev.filter(c => c.slug !== slug))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  return { comics, total, hasMore: comics.length < total || page === 0, loading, error, loadMore, reset, renameLocalComic, deleteLocalComic }
}
