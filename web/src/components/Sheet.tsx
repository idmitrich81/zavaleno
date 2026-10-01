import { useEffect, useRef, type ReactNode } from 'react'
import { SHEET_ORDER, sheetHeight, type SheetState } from '../lib/sheet.ts'

interface Props {
  state: SheetState
  onState: (s: SheetState) => void
  /** Меняется при смене содержимого, чтобы прокрутка начиналась сверху. */
  scrollKey: string
  children: ReactNode
}

// На телефоне это шторка снизу с тремя высотами, на десктопе — обычная панель под шапкой.
export default function Sheet({ state, onState, scrollKey, children }: Props) {
  const sheet = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; h: number } | null>(null)

  useEffect(() => {
    const apply = () => document.documentElement.style.setProperty('--sheet-h', `${sheetHeight(state)}px`)
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [state])

  useEffect(() => {
    body.current?.scrollTo(0, 0)
  }, [scrollKey])

  const step = (dir: 1 | -1) => SHEET_ORDER[Math.min(2, Math.max(0, SHEET_ORDER.indexOf(state) + dir))]

  return (
    <section className="sheet" ref={sheet}>
      <div
        className="grab"
        role="button"
        tabIndex={0}
        aria-label={state === 'full' ? 'Свернуть список' : 'Развернуть список'}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, h: sheet.current!.getBoundingClientRect().height }
          sheet.current!.style.transition = 'none'
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const h = drag.current.h + (drag.current.y - e.clientY)
          sheet.current!.style.height = `${Math.max(120, Math.min(window.innerHeight - 80, h))}px`
        }}
        onPointerUp={(e) => {
          if (!drag.current) return
          const dy = drag.current.y - e.clientY
          drag.current = null
          sheet.current!.style.transition = ''
          sheet.current!.style.height = ''
          if (Math.abs(dy) < 6) onState(state === 'full' ? 'peek' : step(1))
          else if (dy > 40) onState(step(1))
          else if (dy < -40) onState(step(-1))
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          onState(state === 'full' ? 'peek' : step(1))
        }}
      >
        <i />
      </div>
      <div className="sheet-body" ref={body}>
        {children}
      </div>
    </section>
  )
}
