import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'zavaleno.theme'

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

const system = () => window.matchMedia('(prefers-color-scheme: dark)')

// Сохранённый выбор применяем до первой отрисовки, чтобы страница не мигала чужой темой.
const initial = stored()
if (initial) document.documentElement.dataset.theme = initial

/** Тема сайта: выбор человека, а пока он не выбирал — настройка устройства. */
export function useTheme(): [Theme, () => void] {
  const [choice, setChoice] = useState<Theme | null>(initial)
  const [device, setDevice] = useState<Theme>(() => (system().matches ? 'dark' : 'light'))

  useEffect(() => {
    const media = system()
    const update = () => setDevice(media.matches ? 'dark' : 'light')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const theme = choice ?? device

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Без хранилища выбор живёт до перезагрузки страницы.
    }
    setChoice(next)
  }, [theme])

  return [theme, toggle]
}
