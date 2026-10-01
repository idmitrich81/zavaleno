const KEY: string | undefined = import.meta.env.VITE_MAPTILER_KEY

export interface Place {
  /** «проспект Ленина, 36» или только улица, если дома рядом нет. */
  address: string
  /** «Кировский» — без слова «район». */
  district: string | null
}

interface Feature {
  place_type: string[]
  text: string
  address?: string
}

/** Адрес по точке на карте. null — геокодер недоступен или рядом ничего нет. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Place | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}&language=ru`, { signal })
    if (!res.ok) return null
    const { features }: { features: Feature[] } = await res.json()
    const by = (type: string) => features.find((f) => f.place_type.includes(type))
    const house = by('address')
    const street = house ?? by('street') ?? by('road')
    if (!street) return null
    return {
      address: house?.address ? `${house.text}, ${house.address}` : street.text,
      district: by('municipal_district')?.text.replace(/\s*район$/i, '') ?? null,
    }
  } catch {
    return null
  }
}
