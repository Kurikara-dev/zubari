import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/lib/types/api'

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()
    return data.data || data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error. Please check your connection and try again.')
    }
    
    throw new ApiError('An unexpected error occurred. Please try again.')
  }
}

export const projectApi = {
  async create(data: CreateProjectRequest): Promise<Project> {
    return fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getAll(): Promise<Project[]> {
    return fetchApi<Project[]>('/projects')
  },

  async getById(id: string): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}`)
  },

  async update(id: string, data: UpdateProjectRequest): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/projects/${id}`, {
      method: 'DELETE',
    })
  }
}