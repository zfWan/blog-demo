import { defineStore } from 'pinia'
import { api } from '../api'

export interface AuthUser {
  id: string
  email: string
  username: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loaded: false,
  }),
  actions: {
    async fetchMe() {
      try {
        this.user = (await api.get<AuthUser>('/auth/me')).data
      } catch {
        this.user = null
      } finally {
        this.loaded = true
      }
    },
    async login(account: string, password: string) {
      await api.post('/auth/login', { account, password })
      await this.fetchMe()
    },
    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        this.user = null
      }
    },
  },
})
