import { useState } from 'react'
import { Trash2, Loader2, Receipt } from 'lucide-react'
import { api } from '../../api.js'
import { formatRupiah, formatDateTime } from '../../format.js'

/**
 * ExpenseList — tabel riwayat pengeluaran + ringkasan total.
 *
 * Props:
 *   expenses   Expense[]
 *   loading    boolean
 *   onDeleted  () => void
 */
export default function ExpenseList({ expenses, loading, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (id, description) => {
    if (!window.confirm(`Hapus catatan "${description}"?`)) return
    setDeletingId(id)
    try {
      await api.delete(`/expenses/${id}`)
      onDeleted()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Gagal menghapus catatan.')
    } finally {
      setDeletingId(null)
    }
  }

  // Ringkasan total per kategori
  const totalByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Total hari ini
  const todayStr = new Date().toLocaleDateString('id-ID')
  const todayTotal = expenses
    .filter(e => {
      const d = new Date(String(e.created_at).replace(' ', 'T'))
      return d.toLocaleDateString('id-ID') === todayStr
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const CATEGORY_COLORS = {
    'Bahan Baku': 'bg-orange-100 text-orange-700 border-orange-200',
    'Kemasan': 'bg-blue-100 text-blue-700 border-blue-200',
    'Operasional': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lainnya': 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header + ringkasan */}
      <div className="bg-slate-50 border-b border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-slate-600" />
            <h2 className="text-base font-bold text-gray-800">Riwayat Pengeluaran</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Hari Ini</p>
              <p className="text-sm font-black text-orange-600">{formatRupiah(todayTotal)}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Semua</p>
              <p className="text-sm font-black text-slate-800">{formatRupiah(grandTotal)}</p>
            </div>
          </div>
        </div>

        {/* Breakdown per kategori */}
        {Object.keys(totalByCategory).length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.entries(totalByCategory).map(([cat, total]) => (
              <span
                key={cat}
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['Lainnya']}`}
              >
                {cat}: {formatRupiah(total)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabel */}
      {loading ? (
        <div className="flex justify-center items-center py-12 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Memuat data...
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Receipt size={40} className="mb-3 opacity-20" />
          <p className="text-sm">Belum ada catatan pengeluaran</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Nominal</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(expense.created_at)}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">
                    {expense.description}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Lainnya']}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                    {formatRupiah(expense.amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDelete(expense.id, expense.description)}
                      disabled={deletingId === expense.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                        rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Hapus catatan"
                    >
                      {deletingId === expense.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Trash2 size={15} />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
