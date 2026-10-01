import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import type { StyleSpecification } from 'maplibre-gl'
import type { City } from './types.ts'

// В стандартной тёмной теме подписи улиц почти сливаются с фоном: делаем их светлее.
const DARK: Flavor = {
  ...namedFlavor('dark'),
  roads_label_minor: '#9aa3ad',
  roads_label_major: '#b4bcc6',
  subplace_label: '#9aa3ad',
  city_label: '#c8cfd8',
  address_label: '#8b949e',
}

// Карта, шрифты и значки лежат на нашем же домене (public/map): сторонних серверов и ключей нет.
export function mapStyle(city: City, dark: boolean): StyleSpecification {
  const flavor = dark ? 'dark' : 'light'
  const base = `${window.location.origin}/map`
  return {
    version: 8,
    glyphs: `${base}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${base}/sprites/${flavor}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${base}/${city.slug}.pmtiles`,
        attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
      },
    },
    layers: layers('protomaps', dark ? DARK : namedFlavor('light'), { lang: 'ru' }),
  }
}
