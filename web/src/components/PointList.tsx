import { ago, days, daysSince, people, placeLine, plural, snowDays } from '../lib/format.ts'
import type { Point, SortKey } from '../lib/types.ts'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'fresh', label: 'Свежие' },
  { value: 'long', label: 'Дольше ждут' },
  { value: 'confirmed', label: 'Больше подтверждений' },
]

const SORTERS: Record<SortKey, (a: Point, b: Point) => number> = {
  fresh: (a, b) => b.createdAt.localeCompare(a.createdAt),
  long: (a, b) => snowDays(b) - snowDays(a),
  confirmed: (a, b) => b.confirmations - a.confirmations,
}

interface Props {
  /** Все точки города: по ним считается заголовок. */
  all: Point[]
  /** Точки после фильтра и поиска. */
  visible: Point[]
  sort: SortKey
  onSort: (s: SortKey) => void
  onOpen: (id: number) => void
  onReset: () => void
}

function ItemSide({ p }: { p: Point }) {
  if (p.status === 'pending') {
    return (
      <>
        <div className="item-days">На проверке</div>
        <div className="item-sub">видно только вам</div>
      </>
    )
  }
  if (p.status === 'snowed') {
    return (
      <>
        <div className="item-days num">{daysSince(p.createdAt)} дн</div>
        <div className="item-sub">ждёт уборки</div>
      </>
    )
  }
  return (
    <>
      <div className="item-days">{p.status === 'in_work' ? 'В работе' : 'Убрано'}</div>
      {p.statusChangedAt && <div className="item-sub">{ago(p.statusChangedAt)}</div>}
    </>
  )
}

export default function PointList({ all, visible, sort, onSort, onOpen, onReset }: Props) {
  const waiting = all.filter((p) => p.status === 'snowed')
  const oldest = waiting.reduce<Point | null>((a, p) => (!a || p.createdAt < a.createdAt ? p : a), null)
  const pendingFirst = (p: Point) => (p.status === 'pending' ? 0 : 1)
  const sorted = [...visible].sort((a, b) => pendingFirst(a) - pendingFirst(b) || SORTERS[sort](a, b))

  return (
    <>
      <div className="list-head">
        <h2>
          {waiting.length
            ? `${waiting.length} ${plural(waiting.length, ['место ждёт', 'места ждут', 'мест ждут'])} уборки`
            : 'Всё убрано'}
        </h2>
        <p>
          {oldest ? `Дольше всех: ${oldest.address}, ${days(daysSince(oldest.createdAt))}` : 'Новых отметок пока нет'}
        </p>
      </div>
      <div className="sorts" role="group" aria-label="Сортировка">
        {SORTS.map((s) => (
          <button key={s.value} className="sort" aria-pressed={sort === s.value} onClick={() => onSort(s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="empty">
          <b>Здесь ничего не нашлось</b>
          Сбросьте фильтр и поиск.
          <button className="btn" onClick={onReset}>
            Показать все
          </button>
        </div>
      )}
      {sorted.map((p) => (
        <button key={p.id} className={`item ${p.status}`} onClick={() => onOpen(p.id)}>
          <span className="item-bar" />
          <span className="item-main">
            <span className="item-addr">{p.address}</span>
            <span className="item-meta">
              {placeLine(p)}, {people(p.confirmations)}
            </span>
          </span>
          <span className="item-side">
            <ItemSide p={p} />
          </span>
        </button>
      ))}
    </>
  )
}
