import { useState } from 'react'
import { PlusCircle, Loader2 } from 'lucide-react'
import { api } from '../../api.js'
import { EXPENSE_CATEGORIES } from '../../format.js'

/**
 * ExpenseForm — form tambah pengeluaran.
 * Fix bug lama: sekarang benar-benar hit POST /expenses/
 *
 * Props:
 *   onSuccess  () => void  — dipanggil setelah expense berhasil disimpan
 */
export default function ExpenseForm({ onSuccess }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    const formatted = raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''
    setAmount(formatted)
  }

  const amountNumber = parseInt(amount.replace(/\D/g, ''), 10) || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || amountNumber <= 0) {
      setError('Isi deskripsi dan nominal dengan benar.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await api.post('/expenses/', {
        description: description.trim(),
        amount: amountNumber,
        category,
      })
      setDescription('')
      setAmount('')
      setCategory(EXPENSE_CATEGORIES[0])
      setSuccessMsg(`Pengeluaran "${description.trim()}" berhasil dicatat!`)
      setTimeout(() => setSuccessMsg(null), 3000)
      onSuccess()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Gagal mencatat pengeluaran.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-orange-50 border-b border-orange-100 px-5 py-4 flex items-center gap-2">
        <PlusCircle size={20} className="text-orange-600" />
        <h2 className="text-base font-bold text-gray-800">Catat Pengeluaran Baru</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Deskripsi */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Deskripsi Belanja
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Contoh: Beli udang 1kg di Pasar Pagi"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
              focus:border-orange-500 focus:outline-none transition-colors text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Nominal */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountInput}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-right
                  font-bold focus:border-orange-500 focus:outline-none transition-colors text-sm"
                required
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Kategori
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
                focus:border-orange-500 focus:outline-none transition-colors text-sm font-medium
                bg-white cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="text-green-700 text-sm font-medium bg-green-50 px-4 py-2 rounded-xl">
            ✓ {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700
            disabled:bg-gray-300 disabled:cursor-not-allowed
            text-white font-bold py-3.5 rounded-xl transition-colors shadow-md
            flex items-center justify-center gap-2"
        >
          {isSubmitting
            ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
            : <><PlusCircle size={16} /> Simpan Pengeluaran</>
          }
        </button>
      </form>
    </div>
  )
}
