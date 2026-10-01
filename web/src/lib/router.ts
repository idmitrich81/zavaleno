import { useCallback, useEffect, useState } from 'react'
import type { City } from './types.ts'

// Адреса: /{city} — карта и список, /{city}/p/{id} — карточка точки.
function pointIdFromPath(pathname: string): number | null {
  const [, , marker, id] = pathname.split('/')
  return marker === 'p' && /^\d+$/.test(id ?? '') ? Number(id) : null
}

export function usePointRoute(city: City): [number | null, (id: number | null) => void] {
  const [id, setId] = useState(() => pointIdFromPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setId(pointIdFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = useCallback(
    (next: number | null) => {
      const path = next === null ? `/${city.slug}` : `/${city.slug}/p/${next}`
      if (path !== window.location.pathname) window.history.pushState(null, '', path)
      setId(next)
    },
    [city],
  )

  return [id, open]
}
