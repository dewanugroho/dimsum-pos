import { useState } from 'react'
import { Edit2, Trash2, PlusCircle, X, Tags, Loader2, Check } from 'lucide-react'
import { api } from '../../api.js'
import { formatRupiah, CATEGORY_NAMES } from '../../format.js'

const EMPTY_FORM = {
  id: null, name: '', category_id: 1,
  selling_price: '', base_hpp: '', stock_quantity: 100, is_active: true,
}

/**
 * ProductTable — tabel master menu dengan CRUD.
 *
 * Props:
 *   products   Product[]
 *   loading    boolean
 *   onUpdated  () => void
 */
export default function ProductTable({ products, loading, onUpdated }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)

  const openCreate = () => { setForm(EMPTY_FORM); setFormError(null); setIsModalOpen(true) }
  const openEdit = (p) => {
    setForm({
      id: p.id, name: p.name, category_id: p.category_id,
      selling_price: p.selling_price, base_hpp: p.base_hpp,
      stock_quantity: p.stock_quantity, is_active: p.is_active,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category_id: parseInt(form.category_id),
        selling_price: parseFloat(form.selling_price),
        base_hpp: parseFloat(form.base_hpp) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        is_active: form.is_active,
      }
      if (form.id) {
        await api.put(`/products/${form.id}`, payload)
      } else {
        await api.post('/products/', payload)
      }
      setIsModalOpen(false)
      onUpdated()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Gagal menyimpan menu.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus menu "${name}" secara permanen?`)) return
    setDeletingId(id)
    try {
      await api.delete(`/products/${id}`)
      onUpdated()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Gagal menghapus menu.')
    } finally {
      setDeletingId(null)
    }
  }

  const catOptions = Object.entries(CATEGORY_NAMES)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-gray-200 px-5 py-4 flex items-center gap-2">
          <Tags size={18} className="text-slate-600" />
          <h2 className="text-base font-bold text-gray-800">Master Menu (Produk)</h2>
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600
              text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm"
          >
            <PlusCircle size={14} /> Tambah Menu
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Memuat...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Menu & Kategori</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-right">Harga Jual</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-right">HPP</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Stok</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-bold text-gray-800 leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {CATEGORY_NAMES[p.category_id] || `Kategori ${p.category_id}`}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-orange-600 text-right whitespace-nowrap">
                      {formatRupiah(p.selling_price)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                      {formatRupiah(p.base_hpp)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-bold ${p.stock_quantity < 15 ? 'text-red-500' : 'text-green-700'}`}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        p.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deletingId === p.id}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label="Hapus"
                        >
                          {deletingId === p.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Tambah / Edit ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false) }}
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50 sticky top-0">
              <h2 className="text-base font-bold text-gray-800">
                {form.id ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nama Menu</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Dimsum Udang Keju"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                    focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                    focus:border-orange-500 focus:outline-none bg-white cursor-pointer"
                >
                  {catOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Harga Jual */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Harga Jual (Rp)</label>
                  <input
                    type="number" min="0" step="500" required
                    value={form.selling_price}
                    onChange={e => setForm({ ...form, selling_price: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-right
                      focus:border-orange-500 focus:outline-none"
                  />
                </div>
                {/* HPP */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">HPP (Rp)</label>
                  <input
                    type="number" min="0" step="100"
                    value={form.base_hpp}
                    onChange={e => setForm({ ...form, base_hpp: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-right
                      focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Stok */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Stok Awal</label>
                  <input
                    type="number" min="0"
                    value={form.stock_quantity}
                    onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-right
                      focus:border-orange-500 focus:outline-none"
                  />
                </div>
                {/* Status */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={form.is_active ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                      focus:border-orange-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3
                    bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300
                    text-white font-bold rounded-xl transition-colors shadow-md">
                  {isSaving
                    ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                    : <><Check size={16} /> Simpan</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
