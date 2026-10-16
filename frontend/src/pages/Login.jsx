import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'
import { ROLE_DEFAULT_ROUTE } from '../rbac.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Halaman yang ingin dituju sebelum diarahkan ke login (opsional)
  const from = location.state?.from?.pathname ?? null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setError(null)
    setIsLoading(true)

    try {
      await login(username, password)

      // Setelah login berhasil, baca role dari context (AuthProvider sudah update state)
      // Karena state belum re-render sini, baca dari localStorage sebagai workaround cepat
      const role = localStorage.getItem('auth_role')
      const destination = from ?? ROLE_DEFAULT_ROUTE[role] ?? '/kasir'
      navigate(destination, { replace: true })
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 401) {
        setError('Username atau password salah. Silakan coba lagi.')
      } else if (err?.response?.status === 403) {
        setError(detail ?? 'Akun ini dinonaktifkan. Hubungi owner.')
      } else {
        setError(detail ?? 'Gagal terhubung ke server. Pastikan backend menyala.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Logo / Brand ── */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <span className="text-white font-black text-3xl leading-none">D</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">Dimsum Gembul</h1>
            <p className="text-slate-400 text-sm mt-1">Point of Sale System</p>
          </div>
        </div>

        {/* ── Card Login ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header card */}
          <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 text-center">
            <h2 className="text-base font-bold text-slate-700">Masuk ke Akun Anda</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700
                rounded-xl px-4 py-3 text-sm font-medium" role="alert">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold text-gray-700 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(null) }}
                placeholder="Contoh: kasir"
                required
                autoFocus
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                  focus:border-orange-500 focus:outline-none transition-colors
                  placeholder:text-gray-300"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm
                    focus:border-orange-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Tombol submit */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="w-full flex items-center justify-center gap-2
                bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                text-white font-bold py-3.5 rounded-xl transition-colors shadow-md
                mt-2"
            >
              {isLoading
                ? <><Loader2 size={18} className="animate-spin" /> Memverifikasi...</>
                : <><LogIn size={18} /> Masuk</>
              }
            </button>
          </form>
        </div>

        {/* ── Info role (hint untuk dev/testing) ── */}
        <div className="mt-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Role yang tersedia:</p>
          <p><span className="text-orange-400 font-bold">owner</span> — Dashboard, laporan & manajemen</p>
          <p><span className="text-blue-400 font-bold">kasir</span> — Transaksi penjualan</p>
          <p><span className="text-green-400 font-bold">staff_hpp</span> — Pencatatan belanja & HPP</p>
        </div>

      </div>
    </div>
  )
}
