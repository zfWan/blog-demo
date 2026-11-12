import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// 401 统一处理：非分享接口的未登录/过期 → 跳登录页
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url: string = err.config?.url ?? ''
    if (status === 401 && !url.includes('/share/')) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

/** 从 axios 错误中提取后端 message */
export function errMsg(e: unknown): string {
  const data = (e as { response?: { data?: { message?: unknown } } }).response?.data
  return typeof data?.message === 'string' && data.message
    ? data.message
    : '请求失败，请稍后再试'
}
