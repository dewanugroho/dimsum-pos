import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Calculator } from 'lucide-react'
import ExpenseForm from './ExpenseForm.jsx'
import ExpenseList from './ExpenseList.jsx'
import HppCalculator from './HppCalculator.jsx'
import { api } from '../../api.js'

/**
 * HppBelanjaPage — container utama /hpp-belanja.
 * Akses dikontrol oleh ProtectedRoute di App.jsx (role: staff_hpp, owner).
 *
 * Tab:
 *   1. Catat Belanja  — form + riwayat pengeluaran
 *   2. Kalkulator HPP — hitung & terapkan HPP ke menu
 */
export default function HppBelanjaPage() {
  return <HppBelanjaContent />
}

function HppBelanjaContent() {
  const [activeTab, setActiveTab] = useState('belanja')

  // State data yang di-share antara tab
  const [expenses, setExpenses] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)

  const fetchExpenses = useCallback(() => {
    setLoadingExpenses(true)
    api.get('/expenses/')
      .then(res => setExpenses(res.data))
      .catch(err => console.error('Gagal memuat pengeluaran:', err))
      .finally(() => setLoadingExpenses(false))
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const TABS = [
    { id: 'belanja', label: 'Catat Belanja', icon: ShoppingBag },
    { id: 'hpp', label: 'Kalkulator HPP', icon: Calculator },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header + Tab ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-0 shrink-0">
        <h1 className="text-xl font-black text-slate-800 mb-3 pr-16">
          HPP & Catatan Belanja
        </h1>
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all
                ${activeTab === id
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Konten Tab ── */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
        {activeTab === 'belanja' ? (
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            <ExpenseForm onSuccess={fetchExpenses} />
            <ExpenseList
              expenses={expenses}
              loading={loadingExpenses}
              onDeleted={fetchExpenses}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-4">
            <HppCalculator />
          </div>
        )}
      </div>
    </div>
  )
}
