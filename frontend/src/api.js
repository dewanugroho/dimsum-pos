import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

// Pulihkan token dari localStorage saat modul pertama kali dimuat
// (sebelum AuthProvider sempat memanggil setAuthToken)
const savedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('owner_token')
if (savedToken) {
  setAuthToken(savedToken)
}

export function errorDetail(error, fallback) {
  return error?.response?.data?.detail || fallback
}
