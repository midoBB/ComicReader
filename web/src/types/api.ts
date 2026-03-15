export interface Comic {
  slug: string
  name: string
  page_count: number
}

export interface ComicListResponse {
  comics: Comic[]
  total: number
  page: number
  page_size: number
}

export interface PageListResponse {
  slug: string
  name: string
  pages: string[]
}

export interface ComicMeta {
  slug: string
  is_favorite: boolean
  opened: boolean
  last_page: number
}

export interface AllMetaResponse {
  meta: Record<string, ComicMeta>
}
