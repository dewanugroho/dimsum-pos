import { TrendingUp, TrendingDown, ShoppingBag, Package } from 'lucide-react'
import { formatRupiah } from '../../format.js'

/**
 * SummaryCards — 4 kartu KPI ringkasan keuangan.
 *
 * Props:
 *   summary  { total_revenue, total_hpp, total_expenses, gross_profit, net_profit, total_items_sold } | null
 *   loading  boolean
 */
export default function SummaryCards({ summary, loading }) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Omzet',
      value: formatRupiah(summary.total_revenue),
      sub: `${summary.total_items_sold} item terjual`,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Total HPP (Modal)',
      value: formatRupiah(summary.total_hpp),
      sub: 'Estimasi biaya produksi',
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Total Pengeluaran',
      value: formatRupiah(summary.total_expenses),
      sub: 'Belanja & operasional',
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
    {
      label: 'Laba Bersih',
      value: formatRupiah(summary.net_profit),
      sub: summary.net_profit >= 0 ? 'Omzet − HPP − Pengeluaran' : '⚠ Merugi',
      icon: TrendingUp,
      color: summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600',
      bg: summary.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50',
      border: summary.net_profit >= 0 ? 'border-green-100' : 'border-red-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
        <div
          key={label}
          className={`bg-white rounded-2xl border ${border} shadow-sm p-5 flex flex-col gap-3`}
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold text-gray-500 leading-tight">{label}</p>
            <div className={`${bg} ${color} p-2 rounded-xl`}>
              <Icon size={16} />
            </div>
          </div>
          <div>
            <p className={`text-xl font-black ${color} leading-tight`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
