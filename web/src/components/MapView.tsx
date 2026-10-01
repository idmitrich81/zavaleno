import L from 'leaflet'
import 'leaflet.markercluster'
import { useEffect, useRef } from 'react'
import { daysSince } from '../lib/format.ts'
import type { City, Point } from '../lib/types.ts'

const MAPTILER_KEY: string | undefined = import.meta.env.VITE_MAPTILER_KEY

const ICON_TRUCK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>'
const ICON_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'

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

function markerIcon(p: Point): L.DivIcon {
  const inner =
    p.status === 'snowed'
      ? `${daysSince(p.createdAt)} дн`
      : p.status === 'in_work'
        ? `${ICON_TRUCK}в работе`
        : ICON_CHECK
  return L.divIcon({ className: 'mk-wrap', html: `<div class="mk ${p.status}">${inner}</div>`, iconSize: undefined })
}

interface Props {
  city: City
  points: Point[]
}

export default function MapView({ city, points }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const cluster = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: false }).setView(city.center, city.zoom)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    let tiles: L.TileLayer | null = null
    const applyTiles = () => {
      tiles?.remove()
      tiles = tileLayer(scheme.matches)
      tiles?.addTo(map)
    }
    applyTiles()
    scheme.addEventListener('change', applyTiles)

    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      iconCreateFunction: (c) =>
        L.divIcon({ className: 'mk-wrap', html: `<div class="mk-cluster">${c.getChildCount()}</div>`, iconSize: undefined }),
    }).addTo(map)

    return () => {
      scheme.removeEventListener('change', applyTiles)
      cluster.current = null
      map.remove()
    }
  }, [city])

  useEffect(() => {
    const group = cluster.current
    if (!group) return
    group.clearLayers()
    group.addLayers(
      points.map((p) =>
        L.marker([p.lat, p.lng], {
          icon: markerIcon(p),
          title: p.address,
          zIndexOffset: p.status === 'snowed' ? 200 : 0,
        }),
      ),
    )
  }, [points, city])

  return (
    <div className="map" ref={el} aria-label="Карта заваленных мест">
      {!MAPTILER_KEY && !import.meta.env.DEV && <p className="map-note">Карта не настроена: нет ключа MapTiler.</p>}
    </div>
  )
}
