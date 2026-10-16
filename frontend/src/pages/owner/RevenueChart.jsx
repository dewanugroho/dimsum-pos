import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatDate, formatRupiah } from '../../format.js'

/**
 * RevenueChart — grafik bar omzet harian 30 hari terakhir.
 *
 * Props:
 *   data     [{ tanggal, pendapatan, jumlah_order }]
 *   loading  boolean
 */
export default function RevenueChart({ data, loading }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        <p className="text-orange-600 font-black">{formatRupiah(payload[0]?.value)}</p>
        <p className="text-gray-500 text-xs">{payload[1]?.value || 0} transaksi</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-black text-slate-800">Tren Omzet 30 Hari</h3>
        <p className="text-xs text-gray-500 mt-0.5">Hanya transaksi berstatus Lunas</p>
      </div>

      {loading ? (
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Belum ada data transaksi
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="tanggal"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={v => formatDate(v)}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={v => `${v / 1000}k`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="pendapatan" fill="#f97316" radius={[5, 5, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
