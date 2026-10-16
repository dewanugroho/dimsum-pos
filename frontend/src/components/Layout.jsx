import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../AuthContext.jsx'
import { NAV_ITEMS } from '../rbac.js'

/**
 * Shell utama aplikasi.
 *
 * Desktop (≥1024px): sidebar kiri vertikal, konten di kanan.
 * Mobile/Tablet (<1024px): full-screen konten, bottom navbar melayang.
 *
 * Navigasi difilter berdasarkan role aktif dari AuthContext.
 * Tombol Logout selalu tampil di semua role.
 */
export default function Layout() {
  const { role, username, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Hanya tampilkan item yang diizinkan untuk role saat ini
  const navItems = NAV_ITEMS.filter(item =>
    role && item.allowedRoles.includes(role)
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* ════════════════════════════════════════════════════════
          SIDEBAR — desktop only (lg ke atas)
      ════════════════════════════════════════════════════════ */}
      <nav className="hidden lg:flex w-20 bg-slate-900 flex-col items-center py-6 shrink-0 z-20">

        {/* Logo */}
        <div className="mb-6">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="text-white font-black text-lg">D</span>
          </div>
        </div>

        {/* Nav items (filtered by role) */}
        <div className="flex flex-col gap-2 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `w-14 h-14 flex flex-col items-center justify-center rounded-xl gap-1 transition-all
                ${isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">
                    {label.split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Tombol Logout — pinned di bawah sidebar */}
        <div className="mt-auto flex flex-col items-center gap-2 pt-4 border-t border-slate-700 w-full">
          {/* Username kecil */}
          {username && (
            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider truncate max-w-[56px] text-center">
              {username}
            </span>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-14 h-14 flex flex-col items-center justify-center rounded-xl gap-1
              text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <LogOut size={20} strokeWidth={1.8} />
            <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">
              Keluar
            </span>
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          KONTEN UTAMA
      ════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Outlet />
      </main>

      {/* ════════════════════════════════════════════════════════
          BOTTOM NAVBAR — mobile & tablet (< lg)
      ════════════════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch">

          {/* Nav items (filtered by role) */}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors
                ${isActive
                  ? 'text-orange-500'
                  : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Tombol Logout — selalu di ujung kanan bottom navbar */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center py-3 gap-1 px-3
              text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold">Keluar</span>
          </button>

        </div>
      </nav>
    </div>
  )
}
