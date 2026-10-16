import { useState } from 'react'
import { Edit2, Check, X, Package, Loader2 } from 'lucide-react'
import { api } from '../../api.js'
import { formatRupiah } from '../../format.js'

/**
 * WarehouseTable — tabel stok gudang bahan baku dengan inline editing.
 *
 * Props:
 *   warehouse   RawMaterial[]
 *   loading     boolean
 *   onUpdated   () => void
 */
export default function WarehouseTable({ warehouse, loading, onUpdated }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditValue(String(item.stock_quantity))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (id) => {
    const newStock = parseFloat(editValue)
    if (isNaN(newStock) || newStock < 0) {
      alert('Masukkan angka yang valid (≥ 0).')
      return
    }
    setSaving(true)
    try {
      await api.put(`/warehouse/${id}`, { new_stock: newStock })
      setEditingId(null)
      onUpdated()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Gagal memperbarui stok.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-gray-200 px-5 py-4 flex items-center gap-2">
        <Package size={18} className="text-slate-600" />
        <h2 className="text-base font-bold text-gray-800">Gudang Bahan Baku</h2>
        <span className="ml-auto text-xs text-gray-500">{warehouse.length} bahan</span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" /> Memuat...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Nama Bahan Baku</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Stok</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Satuan</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-right">HPP/Satuan</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {warehouse.map(item => {
                const isLow = item.stock_quantity < 10
                const isEditing = editingId === item.id

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">
                      {item.name}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(item.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="w-24 border-2 border-blue-400 rounded-lg px-2 py-1
                            text-center font-bold focus:outline-none text-sm"
                        />
                      ) : (
                        <span className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-green-700'}`}>
                          {item.stock_quantity}
                          {isLow && (
                            <span className="ml-1.5 text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-black">
                              MENIPIS
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{item.unit}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700 text-right">
                      {formatRupiah(item.unit_hpp || 0)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(item.id)}
                              disabled={saving}
                              className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                              aria-label="Simpan"
                            >
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              aria-label="Batal"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="Edit stok"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
