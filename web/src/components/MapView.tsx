import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect, useRef } from 'react'
import { daysSince } from '../lib/format.ts'
import { sheetHeight, type SheetState } from '../lib/sheet.ts'
import type { City, Point } from '../lib/types.ts'

const MAPTILER_KEY: string | undefined = import.meta.env.VITE_MAPTILER_KEY

const ICON_TRUCK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>'
const ICON_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'

// На этом масштабе соседние точки уже не сливаются в кластер.
const FOCUS_ZOOM = 16
// Ширина левой панели на десктопе и высота шапки на телефоне: карта под ними не видна.
const DESKTOP_PANEL = 436
const MOBILE_BAR = 160

function tileLayer(dark: boolean): L.TileLayer | null {
  if (MAPTILER_KEY) {
    const style = dark ? 'streets-v2-dark' : 'streets-v2'
    return L.tileLayer(`https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}{r}.png?key=${MAPTILER_KEY}`, {
      maxZoom: 20,
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>',
    })
  }
  // Публичный сервер OSM годится только для локальной разработки, в продакшене нужен ключ MapTiler.
  if (import.meta.env.DEV) {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>',
    })
  }
  return null
}

function markerIcon(p: Point, selected: boolean): L.DivIcon {
  const inner =
    p.status === 'snowed'
      ? `${daysSince(p.createdAt)} дн`
      : p.status === 'in_work'
        ? `${ICON_TRUCK}в работе`
        : p.status === 'cleared'
          ? ICON_CHECK
          : 'проверка'
  return L.divIcon({
    className: 'mk-wrap',
    html: `<div class="mk ${p.status}${selected ? ' sel' : ''}">${inner}</div>`,
    iconSize: undefined,
  })
}

/** Показывает точку в центре той части карты, которую не закрывают панель или шторка. */
function focus(map: L.Map, p: Point, sheet: SheetState) {
  const size = map.getSize()
  const zoom = Math.max(map.getZoom(), FOCUS_ZOOM)
  const target = window.matchMedia('(min-width: 900px)').matches
    ? L.point(DESKTOP_PANEL + (size.x - DESKTOP_PANEL) / 2, size.y / 2)
    : L.point(size.x / 2, MOBILE_BAR + Math.max(0, size.y - sheetHeight(sheet) - MOBILE_BAR) / 2)
  const shift = target.subtract(size.divideBy(2))
  map.flyTo(map.unproject(map.project([p.lat, p.lng], zoom).subtract(shift), zoom), zoom, { duration: 0.5 })
}

interface Props {
  city: City
  points: Point[]
  selected: Point | null
  sheet: SheetState
  onSelect: (id: number) => void
  /** Если задан, карта сообщает свой центр: так выбирают место под пином. */
  onCenter?: (lat: number, lng: number) => void
  /** Куда перелететь по просьбе снаружи («Где я»); key отличает повторные просьбы. */
  flyTo?: { lat: number; lng: number; key: number } | null
}

export default function MapView({ city, points, selected, sheet, onSelect, onCenter, flyTo }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const cluster = useRef<L.MarkerClusterGroup | null>(null)
  const selectedId = selected?.id ?? null

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false }).setView(city.center, city.zoom)
    L.control.zoom({ position: 'topright' }).addTo(m)
    map.current = m

    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    let tiles: L.TileLayer | null = null
    const applyTiles = () => {
      tiles?.remove()
      tiles = tileLayer(scheme.matches)
      tiles?.addTo(m)
    }
    applyTiles()
    scheme.addEventListener('change', applyTiles)

    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      iconCreateFunction: (c) =>
        L.divIcon({ className: 'mk-wrap', html: `<div class="mk-cluster">${c.getChildCount()}</div>`, iconSize: undefined }),
    }).addTo(m)

    return () => {
      scheme.removeEventListener('change', applyTiles)
      cluster.current = null
      map.current = null
      m.remove()
    }
  }, [city])

  useEffect(() => {
    const group = cluster.current
    if (!group) return
    group.clearLayers()
    group.addLayers(
      points.map((p) =>
        L.marker([p.lat, p.lng], {
          icon: markerIcon(p, p.id === selectedId),
          title: p.address,
          zIndexOffset: p.id === selectedId ? 1000 : p.status === 'snowed' ? 200 : 0,
        }).on('click', () => onSelect(p.id)),
      ),
    )
  }, [points, selectedId, onSelect, city])

  // Летим к точке только при смене выбора, а не при каждом обновлении списка или шторки.
  const flight = useRef({ selected, sheet })
  useEffect(() => {
    flight.current = { selected, sheet }
  })
  useEffect(() => {
    const { selected, sheet } = flight.current
    if (map.current && selected) focus(map.current, selected, sheet)
  }, [selectedId, city])

  useEffect(() => {
    const m = map.current
    if (!m || !onCenter) return
    const report = () => {
      const c = m.getCenter()
      onCenter(c.lat, c.lng)
    }
    report()
    m.on('moveend', report)
    return () => {
      m.off('moveend', report)
    }
  }, [onCenter, city])

  useEffect(() => {
    if (map.current && flyTo) map.current.setView([flyTo.lat, flyTo.lng], Math.max(map.current.getZoom(), 17))
  }, [flyTo, city])

  return (
    <div className="map" ref={el} aria-label="Карта заваленных мест">
      {!MAPTILER_KEY && !import.meta.env.DEV && <p className="map-note">Карта не настроена: нет ключа MapTiler.</p>}
    </div>
  )
}
