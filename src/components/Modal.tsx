import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  open: boolean
  onClose: () => void
  kicker: string
  title: string
  wide?: boolean
  children: ReactNode
}

// Ventana modal con el <dialog> nativo: se cierra con Esc o al pulsar fuera, y el foco queda dentro mientras está abierta.
export function Modal({ open, onClose, kicker, title, wide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`dialog modal${wide ? ' is-wide' : ''}`}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal-inner">
        <header className="dialog-head">
          <div>
            <span className="eyebrow">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button dialog-close" aria-label="Cerrar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  )
}
