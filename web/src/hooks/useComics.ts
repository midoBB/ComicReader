import { useEffect, useState } from 'react'
import { fetchComics } from '../api/client'
import type { Comic } from '../types/api'

export function useComics() {
  const [comics, setComics] = useState<Comic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComics()
      .then(data => setComics(data.comics ?? []))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { comics, loading, error }
}
