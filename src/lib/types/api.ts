import { Database } from './database'

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}

export interface DeleteProjectResponse {
  success: boolean
  message: string
}

export interface AuthUser {
  sub: string
  email: string
  name?: string
  picture?: string
}

export interface AuthContext {
  user: AuthUser
  isAuthenticated: boolean
}