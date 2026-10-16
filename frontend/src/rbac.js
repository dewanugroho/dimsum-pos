/**
 * rbac.js — Konfigurasi RBAC terpusat.
 *
 * Satu-satunya file yang mendefinisikan:
 *   - NAV_ITEMS         : item navigasi beserta role yang diizinkan
 *   - ROLE_DEFAULT_ROUTE: halaman tujuan default per role setelah login
 *
 * Diimpor oleh: App.jsx, Login.jsx, Layout.jsx
 */
import { ShoppingCart, Calculator, LayoutDashboard } from 'lucide-react'

/**
 * Semua item navigasi aplikasi.
 * `allowedRoles` menentukan siapa yang boleh melihat & mengakses item ini.
 */
export const NAV_ITEMS = [
  {
    to: '/kasir',
    icon: ShoppingCart,
    label: 'Kasir',
    allowedRoles: ['kasir', 'owner'],
  },
  {
    to: '/hpp-belanja',
    icon: Calculator,
    label: 'HPP & Belanja',
    allowedRoles: ['staff_hpp', 'owner'],
  },
  {
    to: '/owner',
    icon: LayoutDashboard,
    label: 'Owner',
    allowedRoles: ['owner'],
  },
]

/**
 * Halaman default yang dituju setelah login, per role.
 * Juga dipakai saat role tidak punya akses ke route yang diminta.
 */
export const ROLE_DEFAULT_ROUTE = {
  owner:     '/owner',
  kasir:     '/kasir',
  staff_hpp: '/hpp-belanja',
}
