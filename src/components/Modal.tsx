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
  // Solo cierra si el clic empezó y terminó en el fondo: arrastrar desde dentro (seleccionar texto) no debe cerrarla.
  const pressedBackdrop = useRef(false)

  // Se escuchan los eventos nativos directamente para que el estado de React nunca se quede en "abierto" con la ventana
  // ya cerrada (si no, el botón que la abre dejaba de funcionar después de cerrarla con Esc).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handle = () => closeRef.current()
    // "cancel" sale al pulsar Esc, antes de cerrarse; "close" sale siempre al cerrarse. Con ambos no hay caso en que falle.
    dialog.addEventListener('cancel', handle)
    dialog.addEventListener('close', handle)
    return () => {
      dialog.removeEventListener('cancel', handle)
      dialog.removeEventListener('close', handle)
    }
  }, [])

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
      onPointerDown={(e) => { pressedBackdrop.current = e.target === ref.current }}
      onClick={(e) => {
        if (e.target === ref.current && pressedBackdrop.current) onClose()
        pressedBackdrop.current = false
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
