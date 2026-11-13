import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

interface Props {
  liked: boolean
  count: number
  busy?: boolean
  onClick?: () => void
  // Sin sesión el botón es un enlace a la pantalla de acceso.
  to?: string
}

// Botón de ♥: el corazón late y suelta chispas al darle, y el contador cambia con una pequeña animación.
// Las chispas salen solo cuando el usuario lo pulsa, no al cargar la página con un ♥ ya dado.
export function LikeButton({ liked, count, busy, onClick, to }: Props) {
  const [burst, setBurst] = useState(0)

  const press = () => {
    if (!liked) setBurst((n) => n + 1)
    onClick?.()
  }

  const body = (
    <>
      <span className="like-heart" aria-hidden="true">
        <Icon name="heart" />
        {burst > 0 && (
          <span key={burst} className="like-burst">
            {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` } as CSSProperties} />)}
          </span>
        )}
      </span>
      <span className="like-text">{liked ? 'Te gusta' : 'Me gusta'}</span>
      <b className="like-count" key={count}>{count}</b>
    </>
  )

  const cls = `like-btn${liked ? ' is-liked' : ''}${burst > 0 ? ' has-burst' : ''}`
  if (to) return <Link className={cls} to={to} title="Inicia sesión para dar ♥">{body}</Link>
  return (
    <button type="button" className={cls} onClick={press} disabled={busy} aria-pressed={liked}>
      {body}
    </button>
  )
}
