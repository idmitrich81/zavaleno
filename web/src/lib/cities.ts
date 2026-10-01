import type { City } from './types.ts'

export const CITIES: Record<string, City> = {
  tomsk: { slug: 'tomsk', name: 'Томск', center: [56.4846, 84.9682], zoom: 12 },
}

export const DEFAULT_CITY = CITIES.tomsk

/** Город живёт в первом сегменте пути: zavaleno.ru/tomsk. */
export function cityFromPath(pathname: string): City {
  const slug = pathname.split('/')[1]
  return CITIES[slug] ?? DEFAULT_CITY
}
