import { useEffect, useState } from 'react'
import { fetchPoint, setConfirmed } from '../lib/api.ts'
import { ago, daysSince, people, placeLine, plural, snowDays, STATUS_LABELS } from '../lib/format.ts'
import type { City, Photo, Point, PointEvent } from '../lib/types.ts'

interface Props {
  city: City
  point: Point
  onBack: () => void
  /** Сервер прислал новое число подтверждений: список и карта должны его показать. */
  onConfirmations: (id: number, confirmations: number) => void
}

function daysFact(p: Point): { n: number; label: string } {
  if (p.status === 'pending') return { n: 0, label: 'отметка на проверке' }
  if (p.status === 'snowed') {
    const n = daysSince(p.createdAt)
    return { n, label: `${plural(n, ['день ждёт', 'дня ждёт', 'дней ждёт'])} уборки` }
  }
  const n = snowDays(p)
  const unit = plural(n, ['день', 'дня', 'дней'])
  return { n, label: p.status === 'in_work' ? `${unit} было завалено, сейчас убирают` : `${unit} до уборки` }
}

async function share(point: Point): Promise<string | null> {
  const url = window.location.href
  if (navigator.share) {
    // Отмену системного окна «Поделиться» ошибкой не считаем.
    await navigator.share({ title: `Завалено: ${point.address}`, url }).catch(() => {})
    return null
  }
  await navigator.clipboard.writeText(url)
  return 'Ссылка скопирована'
}

export default function PointCard({ city, point, onBack, onConfirmations }: Props) {
  const [events, setEvents] = useState<PointEvent[] | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmed, setConfirmedByMe] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let stale = false
    fetchPoint(city.slug, point.id).then(
      (detail) => {
        if (stale) return
        setEvents(detail.events)
        setPhotos(detail.photos)
        setConfirmedByMe(detail.confirmedByMe)
      },
      () => !stale && setFailed(true),
    )
    return () => {
      stale = true
    }
  }, [city, point.id])

  const fact = daysFact(point)
  const pending = point.status === 'pending'
  const canConfirm = point.status === 'snowed' || point.status === 'in_work'

  const toggleConfirmed = async () => {
    setSaving(true)
    try {
      const state = await setConfirmed(city.slug, point.id, !confirmed)
      setConfirmedByMe(state.confirmedByMe)
      onConfirmations(point.id, state.confirmations)
      setNotice(state.confirmedByMe ? `Спасибо, теперь вас ${people(state.confirmations)}` : 'Подтверждение снято')
    } catch {
      setNotice('Не получилось сохранить. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`card ${point.status}`}>
      <div className="card-top">
        <button className="back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18 9 12l6-6" />
          </svg>
          Все места
        </button>
      </div>
      {photos.length > 0 && (
        <div className="photos">
          {photos.map((photo) => (
            <img key={photo.id} src={photo.url} alt={`Фото места: ${point.address}`} />
          ))}
        </div>
      )}
      <div className="card-pad">
        <span className="status">
          <span className="dot" />
          {STATUS_LABELS[point.status]}
        </span>
        <h2 className="addr">{point.address}</h2>
        <p className="sub">{placeLine(point)}</p>
        <div className="facts">
          <div className="fact hot">
            <b className="num">{fact.n}</b>
            <span>{fact.label}</span>
          </div>
          <div className="fact">
            <b className="num">{point.confirmations}</b>
            <span>{plural(point.confirmations, ['человек подтвердил', 'человека подтвердили', 'человек подтвердили'])}</span>
          </div>
        </div>
        {pending ? (
          <p className="sub pending-note">
            Модератор проверит фото и адрес. После этого точку увидят все, а пока она видна только вам.
          </p>
        ) : (
          <div className="actions">
            {canConfirm && (
              <button
                className="btn"
                aria-pressed={confirmed}
                disabled={saving || events === null}
                onClick={toggleConfirmed}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {confirmed ? 'Вы подтвердили' : 'Я тоже вижу'}
              </button>
            )}
            <button className="btn" onClick={() => share(point).then(setNotice, () => setNotice('Не получилось скопировать ссылку'))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
              Поделиться
            </button>
          </div>
        )}
        {notice && (
          <p className="hint" role="status">
            {notice}
          </p>
        )}
        <h3 className="sec">История</h3>
        {failed && <p className="sub">Не удалось загрузить историю. Обновите страницу.</p>}
        {!failed && events === null && <p className="sub">Загружаем…</p>}
        {events && (
          <ol className="tl">
            {events.map((e) => (
              <li key={e.id} className={`k-${e.kind}`}>
                {e.text}
                <small>{ago(e.createdAt)}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}
