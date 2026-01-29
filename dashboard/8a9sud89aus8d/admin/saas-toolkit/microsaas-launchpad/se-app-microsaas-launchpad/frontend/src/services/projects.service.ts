import { api } from './api'

export interface ThemeSettings {
  primaryColor?: string
  backgroundColor?: string
  logoUrl?: string
}

export interface EmailTemplate {
  subject?: string
  body?: string
}

export interface EmailTemplatesSettings {
  verifyEmail?: EmailTemplate
  resetPassword?: EmailTemplate
}

export interface Project {
  id: string
  name: string
  description?: string
  allowedDomains: string[]
  settings: {
    allowSignup?: boolean
    allowPasswordReset?: boolean
    requireEmailVerification?: boolean
    oauth?: {
      google?: boolean
      github?: boolean
    }
    theme?: ThemeSettings
    emailTemplates?: EmailTemplatesSettings
  }
  createdAt: string
  updatedAt: string
}

export interface ProjectsResponse {
  data: Project[]
  total: number
  page: number
  limit: number
}

export interface CreateProjectDto {
  name: string
  description?: string
  allowedDomains?: string[]
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  allowedDomains?: string[]
  settings?: Project['settings']
}

export const projectsService = {
  getAll: (page = 1, limit = 10) =>
    api.get<ProjectsResponse>(`/projects?page=${page}&limit=${limit}`),

  getById: (id: string) =>
    api.get<Project>(`/projects/${id}`),

  create: (data: CreateProjectDto) =>
    api.post<Project>('/projects', data),

  update: (id: string, data: UpdateProjectDto) =>
    api.patch<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/projects/${id}`),
}
