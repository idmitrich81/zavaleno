import { useEffect, useRef, useState } from 'react'
import { sendReport, setConfirmed, type Report } from '../lib/api.ts'
import { people, plural, STATUS_LABELS, TYPE_LABELS } from '../lib/format.ts'
import { downscale } from '../lib/image.ts'
import type { City, Point, PointDetail, PointType } from '../lib/types.ts'

export const REPORT_LABEL = 'Сообщить о неубранном снеге'

const MAX_PHOTOS = 3

const TYPE_ICONS: Record<PointType, string> = {
  yard: 'M3 21V9l6-4 6 4v12M15 21V12h6v9M3 21h18M7 13h4M7 17h4',
  parking: 'M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM10 17V7h3a3 3 0 0 1 0 6h-3',
  street: 'M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2',
  sidewalk: 'M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 22l2-7 3 3v4M7 12l3-5 4 2 3 3',
  roof: 'M3 11 12 4l9 7M5 10v11h14V10M9 13v3M12 13v5M15 13v3',
}

interface Draft {
  photos: { blob: Blob; url: string }[]
  place: { lat: number; lng: number; district: string | null } | null
  address: string
  type: PointType | null
  comment: string
  contact: string
}

type Step = 1 | 2 | 3 | 4
type Screen =
  | { name: 'form'; step: Step }
  | { name: 'pin' }
  | { name: 'duplicate'; point: Point }
  | { name: 'done'; openId: number; merged: number | null }

interface Props {
  city: City
  /** Центр карты, пока житель двигает её под пин. */
  center: { lat: number; lng: number } | null
  /** Сообщает, что нужна карта без панелей: идёт выбор места. */
  onPinning: (pinning: boolean) => void
  onLocate: (lat: number, lng: number) => void
  onCreated: (point: PointDetail) => void
  onConfirmations: (id: number, confirmations: number) => void
  /** Закрыть окно; id — какую точку после этого открыть. */
  onClose: (openId: number | null) => void
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const PIN_PATH = 'M12 21s-7-6.1-7-11.3A7 7 0 0 1 19 9.7C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'
const CAMERA_PATH = 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'
const CHECK_PATH = 'm5 12.5 4.5 4.5L19 7'

export default function ReportFlow({ city, center, onPinning, onLocate, onCreated, onConfirmations, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'form', step: 1 })
  const [draft, setDraft] = useState<Draft>({ photos: [], place: null, address: '', type: null, comment: '', contact: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))
  const pinning = screen.name === 'pin'

  // Превью фото живут в памяти браузера: освобождаем их, когда окно закрывается.
  const photos = useRef(draft.photos)
  useEffect(() => {
    photos.current = draft.photos
  })
  useEffect(() => () => photos.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pinning) {
        onPinning(false)
        setScreen({ name: 'form', step: 2 })
      } else onClose(screen.name === 'done' ? screen.openId : null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinning, screen, onPinning, onClose])

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    const picked = [...files].slice(0, MAX_PHOTOS - draft.photos.length)
    const blobs = await Promise.all(picked.map(downscale))
    setDraft((d) => ({
      ...d,
      photos: [...d.photos, ...blobs.map((blob) => ({ blob, url: URL.createObjectURL(blob) }))].slice(0, MAX_PHOTOS),
    }))
  }

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(draft.photos[i].url)
    patch({ photos: draft.photos.filter((_, n) => n !== i) })
  }

  const startPin = () => {
    onPinning(true)
    setScreen({ name: 'pin' })
  }

  const endPin = (accept: boolean) => {
    onPinning(false)
    if (accept && center) {
      patch({ place: { ...center, district: null } })
    }
    setScreen({ name: 'form', step: 2 })
  }

  const locate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocate(pos.coords.latitude, pos.coords.longitude),
      () => setError('Не удалось определить местоположение. Подвиньте карту вручную.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const submit = async (force: boolean) => {
    if (!draft.place || !draft.type) return
    setBusy(true)
    setError(null)
    const report: Report = {
      photos: draft.photos.map((p) => p.blob),
      lat: draft.place.lat,
      lng: draft.place.lng,
      address: draft.address,
      district: draft.place.district,
      type: draft.type,
      comment: draft.comment,
      contact: draft.contact,
    }
    try {
      const result = await sendReport(city.slug, report, force)
      if ('duplicate' in result) setScreen({ name: 'duplicate', point: result.duplicate })
      else {
        onCreated(result.point)
        setScreen({ name: 'done', openId: result.point.id, merged: null })
      }
    } catch {
      setError('Не получилось отправить. Проверьте связь и попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const confirmDuplicate = async (point: Point) => {
    setBusy(true)
    setError(null)
    try {
      const state = await setConfirmed(city.slug, point.id, true)
      onConfirmations(point.id, state.confirmations)
      setScreen({ name: 'done', openId: point.id, merged: state.confirmations })
    } catch {
      setError('Не получилось сохранить. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  if (pinning) {
    return (
      <>
        <div className="pin-dot" />
        <div className="pin-center" aria-hidden="true">
          <svg viewBox="0 0 44 54">
            <path d="M22 2C11 2 3 10.5 3 21c0 13 19 31 19 31s19-18 19-31C41 10.5 33 2 22 2z" fill="currentColor" stroke="#fff" strokeWidth="3" />
            <circle cx="22" cy="21" r="7" fill="#fff" />
          </svg>
        </div>
        <div className="pin-bar">
          <h3>Подвиньте карту под пин</h3>
          <p>Остриё пина должно указывать на заваленное место.</p>
          {error && <p className="form-error">{error}</p>}
          <div className="pin-btns">
            <button className="btn" onClick={() => endPin(false)}>
              Отмена
            </button>
            {'geolocation' in navigator && (
              <button className="btn" onClick={locate}>
                Где я
              </button>
            )}
            <button className="btn primary" onClick={() => endPin(true)}>
              Место здесь
            </button>
          </div>
        </div>
      </>
    )
  }

  const close = () => onClose(screen.name === 'done' ? screen.openId : null)
  const title =
    screen.name === 'duplicate'
      ? 'Похоже, это место уже есть'
      : screen.name === 'done'
        ? screen.merged === null
          ? 'Отметка отправлена'
          : 'Подтверждение засчитано'
        : REPORT_LABEL

  let body
  let foot = null

  if (screen.name === 'duplicate') {
    const d = screen.point
    body = (
      <>
        <div className="place-box">
          <Icon d={PIN_PATH} />
          <div>
            <b>{d.address}</b>
            <div className="sub">
              {STATUS_LABELS[d.status]}, {people(d.confirmations)} уже{' '}
              {plural(d.confirmations, ['подтвердил', 'подтвердили', 'подтвердили'])}
            </div>
          </div>
        </div>
        <p>Если это то же место, добавим ваше подтверждение к нему. Так одна отметка становится весомее.</p>
      </>
    )
    foot = (
      <>
        <button className="btn ghost" disabled={busy} onClick={() => submit(true)}>
          Другое место
        </button>
        <button className="btn primary" disabled={busy} onClick={() => confirmDuplicate(d)}>
          Да, это оно
        </button>
      </>
    )
  } else if (screen.name === 'done') {
    body = (
      <div className="success">
        <div className="big">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={CHECK_PATH} />
          </svg>
        </div>
        <h3>{screen.merged === null ? 'Проверим и опубликуем' : `Спасибо, теперь вас ${people(screen.merged)}`}</h3>
        <p>
          {screen.merged === null
            ? 'Модератор посмотрит фото и адрес. Пока точка видна только вам, серым пунктиром.'
            : 'Чем больше подтверждений, тем заметнее место на карте.'}
        </p>
      </div>
    )
    foot = (
      <button className="btn primary" onClick={close}>
        Вернуться к карте
      </button>
    )
  } else {
    const { step } = screen
    const go = (next: Step) => setScreen({ name: 'form', step: next })
    const ready = [draft.photos.length > 0, draft.place !== null && draft.address.trim() !== '', draft.type !== null, true][step - 1]

    if (step === 1) {
      body = (
        <>
          <p>Сфотографируйте место так, чтобы был виден снег и что-то узнаваемое: подъезд, вывеску, номер дома.</p>
          {draft.photos.length < MAX_PHOTOS && (
            <label className="drop">
              <input type="file" accept="image/*" multiple hidden onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
              <Icon d={CAMERA_PATH} />
              <b>Сделать или выбрать фото</b>
              <span>До {MAX_PHOTOS} фото</span>
            </label>
          )}
          {draft.photos.length > 0 && (
            <div className="thumbs">
              {draft.photos.map((p, i) => (
                <div className="thumb" key={p.url}>
                  <img src={p.url} alt={`Фото ${i + 1}`} />
                  <button onClick={() => removePhoto(i)} aria-label={`Удалить фото ${i + 1}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="hint">Лица и номера машин размываем при проверке, геометку из файла удаляем.</p>
        </>
      )
    } else if (step === 2) {
      body = (
        <>
          <p>Где это? Укажите точку на карте и напишите адрес.</p>
          {draft.place && (
            <div className="place-box">
              <Icon d={PIN_PATH} />
              <div>
                <b>Точка на карте отмечена</b>
                {draft.place.district && <div className="sub">{draft.place.district} район</div>}
              </div>
            </div>
          )}
          <button className="btn wide" onClick={startPin}>
            <Icon d={PIN_PATH} />
            {draft.place ? 'Поправить на карте' : 'Указать на карте'}
          </button>
          <label className="lbl" htmlFor="report-address">
            Адрес
          </label>
          <input
            className="field"
            id="report-address"
            placeholder="Улица и дом"
            maxLength={255}
            value={draft.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
        </>
      )
    } else if (step === 3) {
      body = (
        <>
          <p>Что завалено?</p>
          <div className="types">
            {(Object.keys(TYPE_LABELS) as PointType[]).map((type) => (
              <button key={type} className="type" aria-pressed={draft.type === type} onClick={() => patch({ type })}>
                <Icon d={TYPE_ICONS[type]} />
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </>
      )
    } else {
      body = (
        <>
          <label className="lbl first" htmlFor="report-comment">
            Комментарий, если нужно
          </label>
          <textarea
            className="field"
            id="report-comment"
            rows={3}
            maxLength={1000}
            placeholder="Например: не проехать к подъезду, коляски не проходят"
            value={draft.comment}
            onChange={(e) => patch({ comment: e.target.value })}
          />
          <label className="lbl" htmlFor="report-contact">
            Ваш Telegram или телефон
          </label>
          <input
            className="field"
            id="report-contact"
            placeholder="Необязательно"
            maxLength={100}
            value={draft.contact}
            onChange={(e) => patch({ contact: e.target.value })}
          />
          <p className="hint">Не публикуется. Нужен, чтобы сообщить о решении модератора.</p>
          <p className="hint">Публикуем только фото, адрес и факты: тип места, дату и статус.</p>
        </>
      )
    }

    foot = (
      <>
        {step > 1 && (
          <button className="btn ghost" disabled={busy} onClick={() => go((step - 1) as Step)}>
            Назад
          </button>
        )}
        {step < 4 ? (
          <button className="btn primary" disabled={!ready} onClick={() => go((step + 1) as Step)}>
            Дальше
          </button>
        ) : (
          <button className="btn primary" disabled={busy} onClick={() => submit(false)}>
            {busy ? 'Отправляем…' : 'Отправить'}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="d-head">
          <h2 id="report-title">{title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Закрыть">
            <Icon d="M6 6l12 12M18 6 6 18" />
          </button>
        </div>
        {screen.name === 'form' && (
          <>
            <div className="steps" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <i key={i} className={i <= screen.step ? 'on' : ''} />
              ))}
            </div>
            <div className="step-label">Шаг {screen.step} из 4</div>
          </>
        )}
        <div className="d-body">
          {body}
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="d-foot">{foot}</div>
      </div>
    </div>
  )
}
