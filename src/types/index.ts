export const PROJECT_TYPES = ['app', 'video', 'anuncio', 'post', 'beta', 'demo', 'avance', 'link', 'short'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  app: 'Proyectos',
  video: 'Videos',
  anuncio: 'Anuncios',
  post: 'Posts',
  beta: 'Betas',
  demo: 'Demos',
  avance: 'Avances',
  link: 'Links',
  short: 'Shorts'
}

export type ProjectStatus = 'draft' | 'published'

export interface Project {
  id: string
  type: ProjectType
  title: string
  summary: string
  body: string
  coverUrl: string | null
  mediaUrls: string[]
  links: string[]
  tags: string[]
  authorUid: string
  authorUsername: string
  status: ProjectStatus
  createdAt: number
  updatedAt: number
  views: number
  likes: number
}

export interface ProjectUpdate {
  id: string
  text: string
  createdAt: number
}

export interface Profile {
  id: string
  username: string
  createdAt: number
}
