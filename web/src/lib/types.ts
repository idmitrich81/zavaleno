export type PointStatus = 'snowed' | 'in_work' | 'cleared'

export type PointType = 'yard' | 'parking' | 'street' | 'sidewalk' | 'roof'

/** Публичная точка в том виде, в каком её будет отдавать GET /api/{city}/points. */
export interface Point {
  id: number
  address: string
  district: string
  lat: number
  lng: number
  type: PointType
  status: PointStatus
  createdAt: string
  statusChangedAt: string | null
  confirmations: number
}

export type StatusFilter = PointStatus | 'all'

export interface City {
  slug: string
  name: string
  center: [number, number]
  zoom: number
}
