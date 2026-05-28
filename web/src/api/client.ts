import type { AllMetaResponse, ComicListResponse, ComicMeta, PageListResponse, RenameComicResponse } from '../types/api'

async function readError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text().catch(() => '')
  if (!text) return new Error(fallback)
  try {
    const data = JSON.parse(text)
    if (typeof data?.message === 'string') return new Error(data.message)
    if (typeof data?.error === 'string') return new Error(data.error)
  } catch {
    return new Error(text)
  }
  return new Error(fallback)
}

export async function fetchComics(page = 1, pageSize = 24, filter = 'all', query = '', sort = 'name', direction = 'asc', seed = ''): Promise<ComicListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort,
    direction
  })
  if (filter && filter !== 'all') {
    params.set('filter', filter)
  }
  if (query) {
    params.set('query', query)
  }
  if (seed && sort === 'random') {
    params.set('seed', seed)
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
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/favorite`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  })
  if (!res.ok) throw await readError(res, `Failed to update favorite: ${res.status}`)
}

export async function markOpened(slug: string): Promise<void> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/opened`, {
    method: 'PUT',
  })
  if (!res.ok) throw await readError(res, `Failed to mark opened: ${res.status}`)
}

export async function setProgress(slug: string, page: number): Promise<void> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
  })
  if (!res.ok) throw await readError(res, `Failed to update progress: ${res.status}`)
}

export async function renameComic(slug: string, name: string): Promise<RenameComicResponse> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw await readError(res, `Failed to rename comic: ${res.status}`)
  return res.json()
}

export async function deleteComic(slug: string): Promise<void> {
  const res = await fetch(`/api/comics/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw await readError(res, `Failed to delete comic: ${res.status}`)
}
