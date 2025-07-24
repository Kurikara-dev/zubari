import { supabaseAdmin } from '../supabase'
import { 
  Project, 
  ProjectInsert, 
  ProjectUpdate, 
  CreateProjectRequest,
  UpdateProjectRequest,
  AuthUser 
} from '../types/api'

export class ProjectService {
  static async createProject(
    user: AuthUser, 
    request: CreateProjectRequest
  ): Promise<Project> {
    const { name, description } = request
    
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required')
    }
    
    if (name.length > 100) {
      throw new Error('Project name cannot exceed 100 characters')
    }

    const projectData: ProjectInsert = {
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: user.sub
    }

    if (!supabaseAdmin) {
      throw new Error('Server-side Supabase client is not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create project:', error)
      throw new Error('Failed to create project')
    }

    return data
  }

  static async getUserProjects(
    user: AuthUser,
    options?: {
      search?: string
      dateFrom?: string
      dateTo?: string
      sortBy?: 'created_at' | 'updated_at' | 'name'
      sortOrder?: 'asc' | 'desc'
      page?: number
      limit?: number
    }
  ): Promise<{ data: Project[]; total: number }> {
    if (!supabaseAdmin) {
      throw new Error('Server-side Supabase client is not configured')
    }

    let query = supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('owner_id', user.sub)

    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`)
    }

    if (options?.dateFrom) {
      query = query.gte('created_at', options.dateFrom)
    }

    if (options?.dateTo) {
      query = query.lte('created_at', options.dateTo)
    }

    const sortBy = options?.sortBy || 'created_at'
    const sortOrder = options?.sortOrder || 'desc'
    const ascending = sortOrder === 'asc'
    
    query = query.order(sortBy, { ascending })

    if (options?.page && options?.limit) {
      const from = (options.page - 1) * options.limit
      const to = from + options.limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to fetch projects:', error)
      throw new Error('Failed to fetch projects')
    }

    return {
      data: data || [],
      total: count || 0
    }
  }

  static async getProjectById(
    user: AuthUser, 
    projectId: string
  ): Promise<Project | null> {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    if (!supabaseAdmin) {
      throw new Error('Server-side Supabase client is not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', user.sub)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Failed to fetch project:', error)
      throw new Error('Failed to fetch project')
    }

    return data
  }

  static async updateProject(
    user: AuthUser,
    projectId: string,
    request: UpdateProjectRequest
  ): Promise<Project> {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const existingProject = await this.getProjectById(user, projectId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    const { name, description } = request
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        throw new Error('Project name cannot be empty')
      }
      if (name.length > 100) {
        throw new Error('Project name cannot exceed 100 characters')
      }
    }

    const updateData: ProjectUpdate = {}
    
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return existingProject
    }

    updateData.updated_at = new Date().toISOString()

    if (!supabaseAdmin) {
      throw new Error('Server-side Supabase client is not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('owner_id', user.sub)
      .select()
      .single()

    if (error) {
      console.error('Failed to update project:', error)
      throw new Error('Failed to update project')
    }

    return data
  }

  static async deleteProject(
    user: AuthUser,
    projectId: string
  ): Promise<void> {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const existingProject = await this.getProjectById(user, projectId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    if (!supabaseAdmin) {
      throw new Error('Server-side Supabase client is not configured')
    }

    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('owner_id', user.sub)

    if (error) {
      console.error('Failed to delete project:', error)
      throw new Error('Failed to delete project')
    }
  }

  static validateCreateRequest(request: unknown): CreateProjectRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request body')
    }

    const req = request as Record<string, unknown>
    const { name, description } = req

    if (!name || typeof name !== 'string') {
      throw new Error('Name is required and must be a string')
    }

    if (description !== undefined && typeof description !== 'string') {
      throw new Error('Description must be a string')
    }

    return { name, description }
  }

  static validateUpdateRequest(request: unknown): UpdateProjectRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request body')
    }

    const req = request as Record<string, unknown>
    const { name, description } = req
    const updateRequest: UpdateProjectRequest = {}

    if (name !== undefined) {
      if (typeof name !== 'string') {
        throw new Error('Name must be a string')
      }
      updateRequest.name = name
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        throw new Error('Description must be a string')
      }
      updateRequest.description = description
    }

    return updateRequest
  }
}