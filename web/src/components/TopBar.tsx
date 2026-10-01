import type { Theme } from '../lib/theme.ts'
import type { City, Point, StatusFilter } from '../lib/types.ts'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'snowed', label: 'Завалено' },
  { value: 'in_work', label: 'В работе' },
  { value: 'cleared', label: 'Убрано' },
]

interface Props {
  city: City
  points: Point[]
  filter: StatusFilter
  onFilter: (f: StatusFilter) => void
  query: string
  onQuery: (q: string) => void
  note: string | null
  theme: Theme
  onToggleTheme: () => void
}

export default function TopBar({ city, points, filter, onFilter, query, onQuery, note, theme, onToggleTheme }: Props) {
  const count = (f: StatusFilter) => (f === 'all' ? points.length : points.filter((p) => p.status === f).length)

  return (
    <header className="bar">
      <div className="bar-row">
        <div className="logo">
          <div className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
              <path d="m9 4 3 2 3-2M9 20l3-2 3 2" />
            </svg>
          </div>
          <div className="logo-text">
            <b>Завалено</b>
            <span>Снежная карта: {city.name}</span>
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {theme === 'dark' ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </>
            ) : (
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            )}
          </svg>
        </button>
      </div>
      <label className="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Найти улицу или дом"
          autoComplete="off"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <div className="chips" role="group" aria-label="Фильтр по статусу">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip ${f.value}`}
            aria-pressed={filter === f.value}
            onClick={() => onFilter(f.value)}
          >
            {f.value !== 'all' && <span className="dot" />}
            {f.label}
            <span className="cnt">{count(f.value)}</span>
          </button>
        ))}
      </div>
      {note && (
        <p className="bar-note" role="status">
          {note}
        </p>
      )}
    </header>
  )
}
