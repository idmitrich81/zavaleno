import type { Point } from './types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

interface SeedPoint extends Omit<Point, 'createdAt' | 'statusChangedAt'> {
  createdDaysAgo: number
  statusDaysAgo: number | null
}

// Пока бэкенда нет, точки лежат в public/seed. Когда появится GET /api/{city}/points,
// меняется только эта функция: форма Point уже совпадает с будущим ответом.
export async function fetchPoints(citySlug: string): Promise<Point[]> {
  const res = await fetch(`/seed/${citySlug}.json`)
  if (!res.ok) throw new Error(`Не удалось загрузить точки: ${res.status}`)
  const seed: SeedPoint[] = await res.json()
  const now = Date.now()
  const iso = (daysAgo: number) => new Date(now - daysAgo * DAY_MS).toISOString()
  return seed.map(({ createdDaysAgo, statusDaysAgo, ...p }) => ({
    ...p,
    createdAt: iso(createdDaysAgo),
    statusChangedAt: statusDaysAgo === null ? null : iso(statusDaysAgo),
  }))
}
