import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Package, Tags, Clock, TrendingUp } from 'lucide-react'
import { api } from '../../api.js'
import SummaryCards from './SummaryCards.jsx'
import RevenueChart from './RevenueChart.jsx'
import ProfitLossTable from './ProfitLossTable.jsx'
import BestSellingChart from './BestSellingChart.jsx'
import WarehouseTable from './WarehouseTable.jsx'
import ProductTable from './ProductTable.jsx'
import TransactionHistory from './TransactionHistory.jsx'

/**
 * OwnerPage — container utama /owner.
 * Akses dikontrol oleh ProtectedRoute di App.jsx (role: owner).
 * Semua fetch data dilakukan di sini dan diteruskan ke sub-komponen sebagai props.
 */
export default function OwnerPage() {
  return <OwnerContent />
}

const SECTIONS = [
  { id: 'laporan', label: 'Laporan', icon: BarChart3 },
  { id: 'gudang', label: 'Gudang', icon: Package },
  { id: 'menu', label: 'Menu', icon: Tags },
  { id: 'transaksi', label: 'Transaksi', icon: Clock },
]

function OwnerContent() {
  const [activeSection, setActiveSection] = useState('laporan')

  // ── Data states ──────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null)
  const [profitLoss, setProfitLoss] = useState(null)
  const [analyticsData, setAnalyticsData] = useState([])
  const [bestSelling, setBestSelling] = useState([])
  const [warehouse, setWarehouse] = useState([])
  const [products, setProducts] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState({ reports: true, warehouse: true, products: true, history: true })

  // ── Fetch functions ──────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(prev => ({ ...prev, reports: true }))
    try {
      const [summaryRes, plRes, analyticsRes, bsRes] = await Promise.all([
        api.get('/reports/summary/'),
        api.get('/reports/profit-loss'),
        api.get('/analytics/daily-revenue'),
        api.get('/reports/best-selling'),
      ])
      setSummary(summaryRes.data)
      setProfitLoss(plRes.data)
      setAnalyticsData(analyticsRes.data?.data || [])
      setBestSelling(bsRes.data?.data || [])
    } catch (err) {
      console.error('Gagal memuat laporan:', err)
    } finally {
      setLoading(prev => ({ ...prev, reports: false }))
    }
  }, [])

  const fetchWarehouse = useCallback(async () => {
    setLoading(prev => ({ ...prev, warehouse: true }))
    try {
      const res = await api.get('/warehouse/')
      setWarehouse(res.data)
    } catch (err) {
      console.error('Gagal memuat gudang:', err)
    } finally {
      setLoading(prev => ({ ...prev, warehouse: false }))
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(prev => ({ ...prev, products: true }))
    try {
      const res = await api.get('/products/')
      setProducts(res.data)
    } catch (err) {
      console.error('Gagal memuat produk:', err)
    } finally {
      setLoading(prev => ({ ...prev, products: false }))
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setLoading(prev => ({ ...prev, history: true }))
    try {
      const res = await api.get('/history/')
      setHistory(res.data)
    } catch (err) {
      console.error('Gagal memuat riwayat:', err)
    } finally {
      setLoading(prev => ({ ...prev, history: false }))
    }
  }, [])

  // Fetch semua saat mount
  useEffect(() => {
    fetchReports()
    fetchWarehouse()
    fetchProducts()
    fetchHistory()
  }, [fetchReports, fetchWarehouse, fetchProducts, fetchHistory])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header + Tab navigasi section ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3 pr-16">
          <div>
            <h1 className="text-xl font-black text-slate-800">Dashboard Owner</h1>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <TrendingUp size={12} />
              Dimsum Gembul — Data real-time
            </p>
          </div>
        </div>

        {/* Tab section */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all shrink-0
                ${activeSection === id
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Konten section ── */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
        <div className="max-w-6xl mx-auto p-4 space-y-6">

          {activeSection === 'laporan' && (
            <>
              <SummaryCards summary={summary} loading={loading.reports} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <RevenueChart data={analyticsData} loading={loading.reports} />
                <BestSellingChart data={bestSelling} loading={loading.reports} />
              </div>
              <ProfitLossTable data={profitLoss} loading={loading.reports} />
            </>
          )}

          {activeSection === 'gudang' && (
            <WarehouseTable
              warehouse={warehouse}
              loading={loading.warehouse}
              onUpdated={fetchWarehouse}
            />
          )}

          {activeSection === 'menu' && (
            <ProductTable
              products={products}
              loading={loading.products}
              onUpdated={fetchProducts}
            />
          )}

          {activeSection === 'transaksi' && (
            <TransactionHistory
              history={history}
              loading={loading.history}
            />
          )}
        </div>
      </div>
    </div>
  )
}
