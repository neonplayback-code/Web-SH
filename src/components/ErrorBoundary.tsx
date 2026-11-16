import { Component, type ErrorInfo, type ReactNode } from 'react'

const RELOAD_KEY = 'od_chunk_reload'

// Después de publicar una versión nueva, los archivos viejos desaparecen: abrir una sección que aún pide uno falla así.
const isChunkError = (error: Error) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically/i.test(error.message)

interface State {
  error: Error | null
}

// Si algo falla al dibujar, se muestra un aviso con salida en vez de dejar la pantalla en blanco.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // Una versión nueva se resuelve recargando; se intenta una sola vez para no entrar en bucle.
    if (isChunkError(error)) {
      try {
        if (sessionStorage.getItem(RELOAD_KEY) !== '1') {
          sessionStorage.setItem(RELOAD_KEY, '1')
          window.location.reload()
        }
      } catch {
        /* sin almacenamiento: se muestra el aviso */
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="dashboard page-shell" id="contenido">
        <div className="col-stage">
          <div className="utility-card pub-empty" role="alert">
            <strong>Algo salió mal al mostrar esta página</strong>
            <span>Puede que haya una versión nueva de la web. Recarga para continuar.</span>
            <button type="button" className="save-button" onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      </main>
    )
  }
}
