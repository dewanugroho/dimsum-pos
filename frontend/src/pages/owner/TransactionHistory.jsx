import { useState } from 'react'
import { Clock, Printer, Loader2, Search } from 'lucide-react'
import ReceiptModal from '../../components/ReceiptModal.jsx'
import { formatRupiah, formatDateTime } from '../../format.js'

/**
 * TransactionHistory — tabel riwayat transaksi + cetak struk.
 *
 * Props:
 *   history   TransactionSummary[]
 *   loading   boolean
 */
export default function TransactionHistory({ history, loading }) {
  const [receiptTrx, setReceiptTrx] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = history.filter(trx =>
    trx.id.toLowerCase().includes(search.toLowerCase()) ||
    trx.items_summary?.toLowerCase().includes(search.toLowerCase()),
  )

  // Summary ringkas
  const totalLunas = history.filter(t => t.status === 'Success').length
  const totalPending = history.filter(t => t.status === 'Pending').length
  const totalRevenue = history
    .filter(t => t.status === 'Success')
    .reduce((sum, t) => sum + t.total_amount, 0)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-slate-600" />
            <h2 className="text-base font-bold text-gray-800">Riwayat Transaksi</h2>
          </div>

          {/* Ringkasan */}
          <div className="flex gap-4 flex-wrap mb-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Lunas</p>
              <p className="text-sm font-black text-green-600">{totalLunas}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Pending</p>
              <p className="text-sm font-black text-yellow-600">{totalPending}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Lunas</p>
              <p className="text-sm font-black text-slate-800">{formatRupiah(totalRevenue)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari ID atau item pesanan..."
              className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm
                focus:border-orange-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Memuat...
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[580px]">
              <thead className="bg-white border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Waktu & ID</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Item Pesanan</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Metode</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                      {search ? 'Tidak ada transaksi yang cocok.' : 'Belum ada riwayat transaksi.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(trx => (
                    <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[10px] text-gray-400">{formatDateTime(trx.created_at)}</p>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{trx.id}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 max-w-[200px]">
                        <p className="line-clamp-2">{trx.items_summary || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                          ${trx.payment_method === 'QRIS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                          {trx.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-black text-gray-800 text-right whitespace-nowrap">
                        {formatRupiah(trx.total_amount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                          ${trx.status === 'Success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {trx.status === 'Success' ? 'LUNAS' : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {trx.status === 'Success' && (
                          <button
                            onClick={() => setReceiptTrx(trx)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600
                              rounded-lg transition-colors"
                            aria-label="Cetak struk"
                          >
                            <Printer size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {receiptTrx && (
        <ReceiptModal
          transaction={receiptTrx}
          onClose={() => setReceiptTrx(null)}
        />
      )}
    </>
  )
}
