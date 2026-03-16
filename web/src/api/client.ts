import type { AllMetaResponse, ComicListResponse, ComicMeta, PageListResponse } from '../types/api'

export async function fetchComics(page = 1, pageSize = 24, filter = 'all', query = ''): Promise<ComicListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString()
  })
  if (filter && filter !== 'all') {
    params.set('filter', filter)
  }
  if (query) {
    params.set('query', query)
  }
  const res = await fetch(`/api/comics?${params.toString()}`)
  if (!res.ok) throw new Error(`Failed to fetch comics: ${res.status}`)
  return res.json()
}

export async function fetchPages(slug: string): Promise<PageListResponse> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/pages`)
  if (!res.ok) throw new Error(`Failed to fetch pages: ${res.status}`)
  return res.json()
}

export function thumbnailUrl(slug: string): string {
  return `/api/comics/${encodeURIComponent(slug)}/thumbnail`
}

export function pageUrl(slug: string, idx: number): string {
  return `/api/comics/${encodeURIComponent(slug)}/pages/${idx}`
}

export async function fetchAllMeta(): Promise<AllMetaResponse> {
  const res = await fetch('/api/meta')
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
}

export async function fetchComicMeta(slug: string): Promise<ComicMeta> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/meta`)
  if (!res.ok) throw new Error(`Failed to fetch comic meta: ${res.status}`)
  return res.json()
}

export async function setFavorite(slug: string, favorite: boolean): Promise<void> {
  await fetch(`/api/comics/${encodeURIComponent(slug)}/favorite`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  })
}

export async function markOpened(slug: string): Promise<void> {
  await fetch(`/api/comics/${encodeURIComponent(slug)}/opened`, {
    method: 'PUT',
  })
}

export async function setProgress(slug: string, page: number): Promise<void> {
  await fetch(`/api/comics/${encodeURIComponent(slug)}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
  })
}
