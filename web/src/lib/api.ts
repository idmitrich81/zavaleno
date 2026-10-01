import type { Point } from './types.ts'

export async function fetchPoints(citySlug: string): Promise<Point[]> {
  const res = await fetch(`/api/${citySlug}/points`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Не удалось загрузить точки: ${res.status}`)
  const body: { data: Point[] } = await res.json()
  return body.data
}
