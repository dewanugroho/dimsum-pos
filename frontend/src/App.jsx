import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { ROLE_DEFAULT_ROUTE, NAV_ITEMS } from './rbac.js'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/Login.jsx'
import KasirPage from './pages/kasir/KasirPage.jsx'
import HppBelanjaPage from './pages/hpp-belanja/HppBelanjaPage.jsx'
import OwnerPage from './pages/owner/OwnerPage.jsx'

/**
 * ProtectedRoute — guard berbasis role.
 *
 * - Belum login               → /login (simpan halaman asal)
 * - Login tapi role tidak cukup → halaman default role tersebut
 * - Login & role sesuai        → render <Outlet />
 */
function ProtectedRoute({ allowedRoles }) {
  const { token, role } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!allowedRoles.includes(role)) {
    return <Navigate to={ROLE_DEFAULT_ROUTE[role] ?? '/login'} replace />
  }
  return <Outlet />
}

export default function App() {
  const { role } = useAuth()
  const rootRedirect = ROLE_DEFAULT_ROUTE[role] ?? '/kasir'

  return (
    <Routes>
      {/* Publik */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={rootRedirect} replace />} />

      {/* Halaman yang dilindungi — semua di dalam Layout shell */}
      <Route element={<Layout />}>
        {NAV_ITEMS.map(({ to, allowedRoles }) => {
          const PAGE = {
            '/kasir':       <KasirPage />,
            '/hpp-belanja': <HppBelanjaPage />,
            '/owner':       <OwnerPage />,
          }[to]

          return (
            <Route key={to} element={<ProtectedRoute allowedRoles={allowedRoles} />}>
              <Route path={to} element={PAGE} />
            </Route>
          )
        })}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
