import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.tsx'
import TopBar from './components/TopBar.tsx'
import { fetchPoints } from './lib/api.ts'
import { cityFromPath } from './lib/cities.ts'
import type { Point, StatusFilter } from './lib/types.ts'

const city = cityFromPath(window.location.pathname)
if (window.location.pathname.split('/')[1] !== city.slug) {
  window.history.replaceState(null, '', `/${city.slug}`)
}

export default function App() {
  const [points, setPoints] = useState<Point[] | null>(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetchPoints(city.slug).then(setPoints, () => setError(true))
  }, [])

  const visible = useMemo(
    () => (points ?? []).filter((p) => filter === 'all' || p.status === filter),
    [points, filter],
  )

  const note = error ? 'Не удалось загрузить отметки. Обновите страницу.' : points === null ? 'Загружаем отметки…' : null

  return (
    <>
      <MapView city={city} points={visible} />
      <TopBar city={city} points={points ?? []} filter={filter} onFilter={setFilter} note={note} />
    </>
  )
}
