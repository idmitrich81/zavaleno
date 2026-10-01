import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.tsx'
import PointCard from './components/PointCard.tsx'
import PointList from './components/PointList.tsx'
import ReportFlow, { REPORT_LABEL } from './components/ReportFlow.tsx'
import Sheet from './components/Sheet.tsx'
import TopBar from './components/TopBar.tsx'
import { fetchPoints } from './lib/api.ts'
import { cityFromPath } from './lib/cities.ts'
import { usePointRoute } from './lib/router.ts'
import type { SheetState } from './lib/sheet.ts'
import type { Point, PointDetail, SortKey, StatusFilter } from './lib/types.ts'

const city = cityFromPath(window.location.pathname)
if (window.location.pathname.split('/')[1] !== city.slug) {
  window.history.replaceState(null, '', `/${city.slug}`)
}

export default function App() {
  const [points, setPoints] = useState<Point[] | null>(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('fresh')
  const [selectedId, openPoint] = usePointRoute(city)
  const [sheet, setSheet] = useState<SheetState>(selectedId === null ? 'peek' : 'half')

  const [reporting, setReporting] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; key: number } | null>(null)

  useEffect(() => {
    fetchPoints(city.slug).then(setPoints, () => setError(true))
  }, [])

  const selected = useMemo(() => points?.find((p) => p.id === selectedId) ?? null, [points, selectedId])

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (points ?? []).filter(
      (p) =>
        (filter === 'all' || p.status === filter) &&
        (!q || p.address.toLowerCase().includes(q) || (p.district ?? '').toLowerCase().includes(q)),
    )
  }, [points, filter, query])

  // Открытая точка остаётся на карте, даже если фильтр её скрывает.
  const onMap = useMemo(
    () => (selected && !matching.includes(selected) ? [...matching, selected] : matching),
    [matching, selected],
  )

  const open = useCallback(
    (id: number) => {
      openPoint(id)
      setSheet((s) => (s === 'peek' ? 'half' : s))
    },
    [openPoint],
  )

  const setConfirmations = useCallback((id: number, confirmations: number) => {
    setPoints((all) => all && all.map((p) => (p.id === id ? { ...p, confirmations } : p)))
  }, [])

  const reportCenter = useCallback((lat: number, lng: number) => setCenter({ lat, lng }), [])
  const locate = useCallback((lat: number, lng: number) => setFlyTo({ lat, lng, key: Date.now() }), [])
  const addPoint = useCallback((point: PointDetail) => setPoints((all) => all && [point, ...all]), [])
  const closeReport = useCallback(
    (openId: number | null) => {
      setReporting(false)
      setPinning(false)
      if (openId !== null) open(openId)
    },
    [open],
  )

  const narrow = (apply: () => void) => {
    apply()
    openPoint(null)
  }

  const note = error ? 'Не удалось загрузить отметки. Обновите страницу.' : points === null ? 'Загружаем отметки…' : null

  return (
    <>
      <MapView
        city={city}
        points={onMap}
        selected={selected}
        sheet={sheet}
        onSelect={open}
        onCenter={pinning ? reportCenter : undefined}
        flyTo={flyTo}
      />
      <div className="side" hidden={pinning}>
        <TopBar
          city={city}
          points={points ?? []}
          filter={filter}
          onFilter={(f) => narrow(() => setFilter(f))}
          query={query}
          onQuery={(q) => {
            narrow(() => setQuery(q))
            if (q) setSheet((s) => (s === 'peek' ? 'half' : s))
          }}
          note={note}
        />
        {points && (
          <Sheet state={sheet} onState={setSheet} scrollKey={String(selectedId)}>
            {selected ? (
              <PointCard
                key={selected.id}
                city={city}
                point={selected}
                onBack={() => openPoint(null)}
                onConfirmations={setConfirmations}
              />
            ) : selectedId !== null ? (
              <div className="empty">
                <b>Такой отметки нет</b>
                Возможно, её убрали в архив или ссылка неточная.
                <button className="btn" onClick={() => openPoint(null)}>
                  Все места
                </button>
              </div>
            ) : (
              <PointList
                all={points}
                visible={matching}
                sort={sort}
                onSort={setSort}
                onOpen={open}
                onReset={() => {
                  setFilter('all')
                  setQuery('')
                }}
              />
            )}
          </Sheet>
        )}
      </div>
      {points && !reporting && sheet !== 'full' && (
        <button className="fab" onClick={() => setReporting(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {REPORT_LABEL}
        </button>
      )}
      {reporting && (
        <ReportFlow
          city={city}
          center={center}
          onPinning={setPinning}
          onLocate={locate}
          onCreated={addPoint}
          onConfirmations={setConfirmations}
          onClose={closeReport}
        />
      )}
    </>
  )
}
