import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatRupiah } from '../../format.js'

/**
 * ProfitLossTable — laporan laba-rugi lengkap + breakdown pengeluaran per kategori.
 *
 * Props:
 *   data     { total_revenue, total_hpp, gross_profit, total_expenses, net_profit,
 *              expense_breakdown: [{ category, amount }] } | null
 *   loading  boolean
 */
export default function ProfitLossTable({ data, loading }) {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  const profitPositive = data.net_profit >= 0

  const rows = [
    { label: 'Total Omzet Penjualan', value: data.total_revenue, type: 'income', bold: false },
    { label: 'Total HPP (Biaya Produksi)', value: -data.total_hpp, type: 'expense', bold: false },
    { label: 'Laba Kotor', value: data.gross_profit, type: data.gross_profit >= 0 ? 'profit' : 'loss', bold: true, separator: true },
    { label: 'Total Pengeluaran Operasional', value: -data.total_expenses, type: 'expense', bold: false },
    { label: 'Laba Bersih', value: data.net_profit, type: profitPositive ? 'profit' : 'loss', bold: true, big: true },
  ]

  const typeStyle = {
    income:  'text-blue-700',
    expense: 'text-red-600',
    profit:  'text-green-700',
    loss:    'text-red-700',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-gray-200 px-5 py-4 flex items-center gap-2">
        {profitPositive
          ? <TrendingUp size={18} className="text-green-600" />
          : <TrendingDown size={18} className="text-red-600" />
        }
        <h3 className="text-base font-black text-slate-800">Laporan Laba-Rugi</h3>
        <span className={`ml-auto text-sm font-black ${profitPositive ? 'text-green-600' : 'text-red-600'}`}>
          {profitPositive ? '▲ Profit' : '▼ Rugi'}
        </span>
      </div>

      <div className="p-5">
        <div className="space-y-1">
          {rows.map(({ label, value, type, bold, big, separator }) => (
            <div key={label}>
              {separator && <div className="border-t border-gray-200 my-3" />}
              <div className={`flex justify-between items-center py-2 ${big ? 'bg-slate-50 rounded-xl px-3' : ''}`}>
                <span className={`text-sm ${bold ? 'font-bold text-slate-800' : 'text-gray-600'}`}>
                  {label}
                </span>
                <span className={`font-black ${big ? 'text-lg' : 'text-sm'} ${typeStyle[type]}`}>
                  {value >= 0
                    ? formatRupiah(value)
                    : `− ${formatRupiah(Math.abs(value))}`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Breakdown pengeluaran per kategori */}
        {data.expense_breakdown?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Rincian Pengeluaran per Kategori
            </p>
            <div className="space-y-2">
              {data.expense_breakdown.map(({ category, amount }) => {
                const pct = data.total_expenses > 0
                  ? Math.round((amount / data.total_expenses) * 100)
                  : 0
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700 font-medium">{category}</span>
                      <span className="text-sm font-bold text-gray-800">
                        {formatRupiah(amount)}
                        <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
