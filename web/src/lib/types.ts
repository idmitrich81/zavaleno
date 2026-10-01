/** pending приходит только автору отметки: остальным точка на проверке не видна. */
export type PointStatus = 'pending' | 'snowed' | 'in_work' | 'cleared'

export type PointType = 'yard' | 'parking' | 'street' | 'sidewalk' | 'roof'

export type EventKind = 'submitted' | 'created' | 'confirmed' | 'in_work' | 'cleared' | 'reopened'

export interface PointEvent {
  id: number
  kind: EventKind
  text: string
  createdAt: string
}

/** Публичная точка: элемент ответа GET /api/{city}/points. */
export interface Point {
  id: number
  address: string
  district: string | null
  lat: number
  lng: number
  type: PointType
  status: PointStatus
  createdAt: string
  statusChangedAt: string | null
  confirmations: number
}

/** Ответ GET /api/{city}/points/{id}: точка с лентой событий, свежие сверху. */
export interface Photo {
  id: number
  url: string
  kind: 'before' | 'after'
}

export interface PointDetail extends Point {
  events: PointEvent[]
  photos: Photo[]
  confirmedByMe: boolean
}

export interface ConfirmationState {
  confirmations: number
  confirmedByMe: boolean
}

export type StatusFilter = Exclude<PointStatus, 'pending'> | 'all'

export type SortKey = 'fresh' | 'long' | 'confirmed'

export interface City {
  slug: string
  name: string
  center: [number, number]
  zoom: number
}
