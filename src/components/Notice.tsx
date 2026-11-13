import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return <div className="utility-card pub-notice" role="status">{children}</div>
}
