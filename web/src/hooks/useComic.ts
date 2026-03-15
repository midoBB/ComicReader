import { useEffect, useState } from 'react'
import { fetchPages } from '../api/client'
import type { PageListResponse } from '../types/api'

export function useComic(slug: string) {
  const [data, setData] = useState<PageListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchPages(slug)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  return { data, loading, error }
}
