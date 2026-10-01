export type SheetState = 'peek' | 'half' | 'full'

export const SHEET_ORDER: SheetState[] = ['peek', 'half', 'full']

export function sheetHeight(state: SheetState): number {
  const vh = window.innerHeight
  return state === 'peek' ? 176 : state === 'half' ? Math.round(vh * 0.56) : vh - 96
}
