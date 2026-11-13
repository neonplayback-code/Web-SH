import { Link } from 'react-router'
import { PROJECT_TYPE_LABELS, type Project } from '../types'

// Tarjeta de publicación con el diseño de las tarjetas de juegos de la extensión: portada grande y ficha debajo.
export function ProjectCard({ project }: { project: Project }) {
  const initials = project.title.trim().slice(0, 2).toUpperCase()
  return (
    <article className="game-card">
      <Link className="game-link" to={`/p/${project.id}`}>
        <span className="game-art" data-initials={initials}>
          {project.coverUrl && <img src={project.coverUrl} alt="" loading="lazy" />}
        </span>
        <span className="game-info">
          <strong>{project.title}</strong>
          <small>{PROJECT_TYPE_LABELS[project.type].toUpperCase()} · @{project.authorUsername} · ♥ {project.likes ?? 0}</small>
          {project.summary && <span className="pub-summary">{project.summary}</span>}
        </span>
      </Link>
    </article>
  )
}
