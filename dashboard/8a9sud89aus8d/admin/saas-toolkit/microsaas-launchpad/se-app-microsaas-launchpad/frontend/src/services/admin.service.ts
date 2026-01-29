import { api } from './api'

export interface DashboardStats {
  totalProjects: number
  apiCalls: number
}

export interface DashboardData {
  stats: DashboardStats
  recentProjects: AdminProject[]
}

export interface AdminProject {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const adminService = {
  async getStats(): Promise<DashboardStats> {
    return api.get<DashboardStats>('/admin/stats')
  },

  async getDashboard(): Promise<DashboardData> {
    return api.get<DashboardData>('/admin/dashboard')
  },
}
