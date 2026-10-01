import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Protocol } from 'pmtiles'
import { useEffect, useRef, useState } from 'react'
import Supercluster from 'supercluster'
import { daysSince } from '../lib/format.ts'
import { mapStyle } from '../lib/mapStyle.ts'
import { sheetHeight, type SheetState } from '../lib/sheet.ts'
import type { City, Point } from '../lib/types.ts'

// Сборщик сам не находит фоновый скрипт MapLibre, поэтому путь к нему задаём явно.
maplibregl.setWorkerUrl(workerUrl)
maplibregl.addProtocol('pmtiles', new Protocol().tile)

const ICON_TRUCK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>'
const ICON_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'

// На этом масштабе соседние точки уже не сливаются в кластер.
const FOCUS_ZOOM = 16
// Ширина левой панели на десктопе и высота шапки на телефоне: карта под ними не видна.
const DESKTOP_PANEL = 436
const MOBILE_BAR = 160

const scheme = () => window.matchMedia('(prefers-color-scheme: dark)')

function markerElement(p: Point, selected: boolean, onSelect: (id: number) => void): HTMLElement {
  const inner =
    p.status === 'snowed'
      ? `${daysSince(p.createdAt)} дн`
      : p.status === 'in_work'
        ? `${ICON_TRUCK}в работе`
        : p.status === 'cleared'
          ? ICON_CHECK
          : 'проверка'
  const el = document.createElement('button')
  el.className = `mk ${p.status}${selected ? ' sel' : ''}`
  el.title = p.address
  el.innerHTML = inner
  el.addEventListener('click', () => onSelect(p.id))
  return el
}

/** Сдвиг от центра экрана до центра той части карты, которую не закрывают панель или шторка. */
function visibleOffset(sheet: SheetState): [number, number] {
  return window.matchMedia('(min-width: 900px)').matches
    ? [DESKTOP_PANEL / 2, 0]
    : [0, (MOBILE_BAR - Math.min(sheetHeight(sheet), sheetHeight('half'))) / 2]
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
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const selectedId = selected?.id ?? null
  const pinning = onCenter !== undefined

  const centerListener = useRef(onCenter)
  useEffect(() => {
    centerListener.current = onCenter
  })

  useEffect(() => {
    const media = scheme()
    const m = new maplibregl.Map({
      container: el.current!,
      style: mapStyle(city, media.matches),
      center: [city.center[1], city.center[0]],
      // Масштаб MapLibre на единицу меньше привычного «плиточного».
      zoom: city.zoom - 1,
      minZoom: 9,
      maxZoom: 18,
      // Файл карты кончается на границах города: дальше была бы пустота.
      maxBounds: city.bounds,
      attributionControl: false,
      // Поворот и наклон на карте отметок только мешают.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right')
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('moveend', () => {
      const c = m.getCenter()
      centerListener.current?.(c.lat, c.lng)
    })
    const applyTheme = () => m.setStyle(mapStyle(city, media.matches))
    media.addEventListener('change', applyTheme)
    setMap(m)

    return () => {
      media.removeEventListener('change', applyTheme)
      m.remove()
      setMap(null)
    }
  }, [city])

  // Маркеры и кластеры: пересчитываем при смене точек, выбора и после каждого движения карты.
  useEffect(() => {
    if (!map) return
    const byId = new Map(points.map((p) => [p.id, p]))
    const index = new Supercluster<{ id: number }>({ radius: 44, maxZoom: FOCUS_ZOOM - 1 })
    index.load(
      points.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id },
      })),
    )

    let markers: maplibregl.Marker[] = []
    const render = () => {
      markers.forEach((marker) => marker.remove())
      const b = map.getBounds()
      markers = index.getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], Math.round(map.getZoom())).map((item) => {
        const [lng, lat] = item.geometry.coordinates
        let element: HTMLElement
        if ('cluster' in item.properties) {
          const clusterId = item.properties.cluster_id
          element = document.createElement('button')
          element.className = 'mk-cluster'
          element.textContent = String(item.properties.point_count)
          element.addEventListener('click', () =>
            map.easeTo({ center: [lng, lat], zoom: index.getClusterExpansionZoom(clusterId), duration: 300 }),
          )
        } else {
          const p = byId.get(item.properties.id)!
          element = markerElement(p, p.id === selectedId, onSelect)
          if (p.id === selectedId) element.style.zIndex = '2'
          else if (p.status === 'snowed') element.style.zIndex = '1'
        }
        // Обёртка нулевого размера: сам значок позиционирует себя стилями относительно точки.
        const anchor = document.createElement('div')
        anchor.className = 'mk-anchor'
        anchor.append(element)
        return new maplibregl.Marker({ element: anchor }).setLngLat([lng, lat]).addTo(map)
      })
    }
    render()
    map.on('moveend', render)
    return () => {
      map.off('moveend', render)
      markers.forEach((marker) => marker.remove())
    }
  }, [map, points, selectedId, onSelect])

  // Летим к точке только при смене выбора, а не при каждом обновлении списка или шторки.
  const flight = useRef({ selected, sheet })
  useEffect(() => {
    flight.current = { selected, sheet }
  })
  useEffect(() => {
    const { selected, sheet } = flight.current
    if (!map || !selected) return
    const [dx, dy] = visibleOffset(sheet)
    map.easeTo({
      center: [selected.lng, selected.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      offset: [dx, dy],
      duration: 500,
    })
  }, [map, selectedId])

  useEffect(() => {
    if (!map || !pinning) return
    const c = map.getCenter()
    centerListener.current?.(c.lat, c.lng)
  }, [map, pinning])

  useEffect(() => {
    if (map && flyTo) map.easeTo({ center: [flyTo.lng, flyTo.lat], zoom: Math.max(map.getZoom(), 17), duration: 300 })
  }, [map, flyTo])

  return <div className="map" ref={el} aria-label="Карта заваленных мест" />
}
