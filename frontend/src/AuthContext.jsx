import { createContext, useContext, useMemo, useState } from 'react'
import { api, setAuthToken } from './api'

/**
 * AuthContext — menyimpan state autentikasi RBAC berbasis JWT.
 *
 * Storage: localStorage (bertahan antar tab & refresh, sampai logout eksplisit).
 * Key yang digunakan:
 *   auth_token  — JWT access token
 *   auth_role   — role pengguna: "owner" | "kasir" | "staff_hpp"
 *   auth_user   — username
 *   auth_name   — full_name (opsional)
 *
 * Value yang disediakan via context:
 *   token      string | null
 *   role       string | null      ("owner" | "kasir" | "staff_hpp")
 *   username   string | null
 *   fullName   string | null
 *   unlocked   boolean            — true jika ada token valid (backward-compat PinGuard)
 *   login      (username, password) => Promise<void>
 *   logout     () => void
 */

const AuthContext = createContext(null)

// ── Helper: baca state awal dari localStorage ─────────────────────────────
function readStorage() {
  return {
    token:    localStorage.getItem('auth_token'),
    role:     localStorage.getItem('auth_role'),
    username: localStorage.getItem('auth_user'),
    fullName: localStorage.getItem('auth_name'),
  }
}

// ── Helper: tulis ke localStorage + set axios header ──────────────────────
function writeStorage({ token, role, username, fullName }) {
  localStorage.setItem('auth_token',  token)
  localStorage.setItem('auth_role',   role)
  localStorage.setItem('auth_user',   username)
  localStorage.setItem('auth_name',   fullName ?? '')
  setAuthToken(token)
}

// ── Helper: bersihkan localStorage + hapus axios header ───────────────────
function clearStorage() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_role')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth_name')
  // Hapus juga key lama (migrasi dari sessionStorage) agar tidak ghost
  sessionStorage.removeItem('owner_token')
  setAuthToken(null)
}

// ── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = readStorage()
    // Pulihkan axios header dari token yang sudah tersimpan
    if (stored.token) setAuthToken(stored.token)
    return stored
  })

  /**
   * login — memanggil POST /auth/login dengan username + password.
   * Menyimpan token + role + info akun ke localStorage.
   *
   * @throws Error dengan pesan dari backend (detail) jika login gagal.
   */
  const login = async (username, password) => {
    const response = await api.post('/auth/login', {
      username: username.trim().toLowerCase(),
      password,
    })

    const { access_token, role, username: uname, full_name } = response.data

    const next = {
      token:    access_token,
      role,
      username: uname,
      fullName: full_name ?? null,
    }

    writeStorage(next)
    setAuth(next)
  }

  /**
   * logout — bersihkan semua state auth.
   */
  const logout = () => {
    clearStorage()
    setAuth({ token: null, role: null, username: null, fullName: null })
  }

  const value = useMemo(
    () => ({
      token:    auth.token,
      role:     auth.role,
      username: auth.username,
      fullName: auth.fullName,
      // unlocked dipertahankan untuk backward-compat PinGuard & komponen lama
      unlocked: Boolean(auth.token),
      login,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>.')
  }
  return context
}
