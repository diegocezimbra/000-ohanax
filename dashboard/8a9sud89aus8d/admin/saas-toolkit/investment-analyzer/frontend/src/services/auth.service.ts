import { api } from './api'

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerified: boolean
  provider: string
  createdAt: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface SignUpData {
  email: string
  password: string
  name?: string
}

export interface SignInData {
  email: string
  password: string
}

export const authService = {
  async login(data: SignInData): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/admin/login', data)
  },

  async signup(data: SignUpData): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/admin/signup', data)
  },

  async logout(): Promise<void> {
    return api.post('/auth/signout')
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me')
  },

  async updateMe(data: Partial<Pick<User, 'name' | 'avatar'>>): Promise<User> {
    return api.patch<User>('/auth/me', data)
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return api.post('/auth/refresh', { refreshToken })
  },
}
