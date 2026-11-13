import type { Profile, Project, ProjectStatus, ProjectType, ProjectUpdate } from '../types'

// Forma de una fila de la tabla projects (snake_case, como la devuelve Supabase).
export interface ProjectRow {
  id: string
  type: ProjectType
  title: string
  summary: string
  body: string
  cover_url: string | null
  media_urls: string[]
  links: string[]
  tags: string[]
  author_id: string
  author_username: string
  status: ProjectStatus
  created_at: number
  updated_at: number
  views: number
  likes: number
}

export const PROJECT_SELECT = '*'

export function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    summary: r.summary,
    body: r.body,
    coverUrl: r.cover_url,
    mediaUrls: r.media_urls ?? [],
    links: r.links ?? [],
    tags: r.tags ?? [],
    authorUid: r.author_id,
    authorUsername: r.author_username,
    status: r.status,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    views: r.views ?? 0,
    likes: r.likes ?? 0
  }
}

export function toUpdate(r: { id: string; text: string; created_at: number }): ProjectUpdate {
  return { id: r.id, text: r.text, createdAt: Number(r.created_at) }
}

export function toProfile(r: { id: string; username: string; created_at: number }): Profile {
  return { id: r.id, username: r.username, createdAt: Number(r.created_at) }
}
