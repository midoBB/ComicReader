import { useEffect, useState } from 'react'
import { fetchAllMeta, setFavorite } from '../api/client'
import type { ComicMeta } from '../types/api'

export function useAllMeta() {
  const [meta, setMeta] = useState<Record<string, ComicMeta>>({})

  useEffect(() => {
    fetchAllMeta()
      .then(res => setMeta(res.meta))
      .catch(() => {/* silently ignore */})
  }, [])

  function updateLocalFavorite(slug: string, fav: boolean) {
    setMeta(prev => ({
      ...prev,
      [slug]: { slug, is_favorite: fav, opened: prev[slug]?.opened ?? false, last_page: prev[slug]?.last_page ?? 0 },
    }))
    setFavorite(slug, fav)
  }

  return { meta, updateLocalFavorite }
}
