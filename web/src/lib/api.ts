import { deviceId } from './device.ts'
import type { ConfirmationState, Point, PointDetail, PointType } from './types.ts'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Запрос не удался: ${status}`)
    this.status = status
    this.body = body
  }
}

async function request<T>(method: string, path: string, body?: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { Accept: 'application/json', 'X-Device-Id': deviceId() },
    body,
  })
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, json)
  return (json as { data: T }).data
}

export const fetchPoints = (citySlug: string) => request<Point[]>('GET', `/${citySlug}/points`)

export const fetchPoint = (citySlug: string, id: number) => request<PointDetail>('GET', `/${citySlug}/points/${id}`)

/** «Я тоже вижу» и его отмена. */
export const setConfirmed = (citySlug: string, id: number, confirmed: boolean) =>
  request<ConfirmationState>(confirmed ? 'POST' : 'DELETE', `/${citySlug}/points/${id}/confirmation`)

export interface Report {
  photos: Blob[]
  lat: number
  lng: number
  address: string
  district: string | null
  type: PointType
  comment: string
  contact: string
}

export type ReportResult = { point: PointDetail } | { duplicate: Point }

/** Отправляет отметку. Если рядом уже есть незакрытая точка, возвращает её; force отправляет всё равно. */
export async function sendReport(citySlug: string, report: Report, force: boolean): Promise<ReportResult> {
  const form = new FormData()
  report.photos.forEach((photo, i) => form.append('photos[]', photo, `photo-${i + 1}.jpg`))
  form.set('lat', String(report.lat))
  form.set('lng', String(report.lng))
  form.set('address', report.address.trim())
  if (report.district) form.set('district', report.district)
  form.set('type', report.type)
  if (report.comment.trim()) form.set('comment', report.comment.trim())
  if (report.contact.trim()) form.set('contact', report.contact.trim())
  if (force) form.set('force', '1')

  try {
    return { point: await request<PointDetail>('POST', `/${citySlug}/points`, form) }
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      return { duplicate: (e.body as { duplicate: Point }).duplicate }
    }
    throw e
  }
}
