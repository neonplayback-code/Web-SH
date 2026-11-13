import { supabase } from './supabase'

export interface LikeResult {
  liked: boolean
  likes: number
}

// El like y el contador se cambian en una sola función del servidor (toggle_like), así nunca se separan.
export async function toggleLike(projectId: string): Promise<LikeResult> {
  const { data, error } = await supabase.rpc('toggle_like', { p_project_id: projectId })
  if (error) throw new Error(error.message)
  return data as LikeResult
}

export async function hasLiked(projectId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('project_likes')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}
