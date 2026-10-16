import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Award } from 'lucide-react'

/**
 * BestSellingChart — bar chart horizontal produk terlaris.
 *
 * Props:
 *   data     [{ product_name, total_qty, total_revenue }]
 *   loading  boolean
 */
export default function BestSellingChart({ data, loading }) {
  const COLORS = [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#fde68a', '#fef3c7', '#e5e7eb', '#d1d5db',
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-bold text-gray-700 mb-1 max-w-[160px] truncate">{d?.product_name}</p>
        <p className="text-orange-600 font-black">{d?.total_qty} pcs</p>
      </div>
    )
  }

  // Potong nama panjang untuk label sumbu
  const truncate = (str, n = 16) => str?.length > n ? str.slice(0, n) + '…' : str

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award size={18} className="text-orange-500" />
        <div>
          <h3 className="text-base font-black text-slate-800">Produk Terlaris</h3>
          <p className="text-xs text-gray-500 mt-0.5">Top 8 berdasarkan qty terjual</p>
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Belum ada data penjualan
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="product_name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 10 }}
                width={110}
                tickFormatter={v => truncate(v, 14)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="total_qty" radius={[0, 5, 5, 0]} maxBarSize={20}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
