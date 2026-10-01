import type { Point, PointStatus, PointType } from './types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

export const TYPE_LABELS: Record<PointType, string> = {
  yard: 'Двор',
  parking: 'Парковка',
  street: 'Улица',
  sidewalk: 'Тротуар',
  roof: 'Крыша, сосульки',
}

export const STATUS_LABELS: Record<PointStatus, string> = {
  pending: 'На проверке',
  snowed: 'Завалено',
  in_work: 'В работе',
  cleared: 'Убрано',
}

type Forms = [string, string, string]

export function plural(n: number, forms: Forms): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

const DAYS: Forms = ['день', 'дня', 'дней']
const PEOPLE: Forms = ['человек', 'человека', 'человек']

export const days = (n: number) => `${n} ${plural(n, DAYS)}`
export const people = (n: number) => `${n} ${plural(n, PEOPLE)}`

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS))
}

export function ago(iso: string): string {
  const d = daysSince(iso)
  return d === 0 ? 'сегодня' : d === 1 ? 'вчера' : `${days(d)} назад`
}

/** Сколько дней место было завалено: до уборки, если убрано, иначе до сегодня. */
export function snowDays(p: Point): number {
  if (p.status === 'cleared' && p.statusChangedAt) {
    const span = new Date(p.statusChangedAt).getTime() - new Date(p.createdAt).getTime()
    return Math.max(1, Math.floor(span / DAY_MS))
  }
  return daysSince(p.createdAt)
}

export function placeLine(p: Point): string {
  return p.district ? `${TYPE_LABELS[p.type]}, ${p.district} район` : TYPE_LABELS[p.type]
}
