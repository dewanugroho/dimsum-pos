import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Calculator, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { api } from '../../api.js'
import { formatRupiah } from '../../format.js'

/**
 * HppCalculator — kalkulator HPP berbasis bahan baku.
 *
 * Alur:
 *   1. Pilih produk target & input jumlah porsi
 *   2. Tambah baris bahan baku (dropdown raw_material + qty)
 *   3. POST /hpp/calculate → tampilkan breakdown biaya & HPP/porsi
 *   4. POST /hpp/apply → simpan HPP ke produk
 */
export default function HppCalculator() {
  const [products, setProducts] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [portions, setPortions] = useState('1')
  const [lines, setLines] = useState([{ raw_material_id: '', quantity: '' }])

  // Hasil kalkulasi
  const [result, setResult] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [prodRes, matRes] = await Promise.all([
        api.get('/products/'),
        api.get('/raw-materials/'),
      ])
      setProducts(prodRes.data)
      setRawMaterials(matRes.data)
    } catch (err) {
      console.error('Gagal memuat data kalkulator:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Manajemen baris bahan baku ─────────────────────────────────────
  const addLine = () =>
    setLines(prev => [...prev, { raw_material_id: '', quantity: '' }])

  const removeLine = (idx) =>
    setLines(prev => prev.filter((_, i) => i !== idx))

  const updateLine = (idx, field, value) =>
    setLines(prev => prev.map((line, i) => i === idx ? { ...line, [field]: value } : line))

  // Hitung preview biaya per baris secara real-time
  const getLineCost = (line) => {
    if (!line.raw_material_id || !line.quantity) return null
    const mat = rawMaterials.find(m => m.id === parseInt(line.raw_material_id))
    if (!mat) return null
    return (mat.unit_hpp || 0) * parseFloat(line.quantity || 0)
  }

  // ── Kalkulasi HPP ──────────────────────────────────────────────────
  const handleCalculate = async () => {
    setError(null)
    setResult(null)
    setApplySuccess(false)

    const validLines = lines.filter(l => l.raw_material_id && parseFloat(l.quantity) > 0)
    if (validLines.length === 0) {
      setError('Tambahkan minimal satu bahan baku dengan kuantitas > 0.')
      return
    }
    if (!portions || parseFloat(portions) <= 0) {
      setError('Masukkan jumlah porsi yang valid.')
      return
    }

    setIsCalculating(true)
    try {
      const res = await api.post('/hpp/calculate', {
        portions: parseFloat(portions),
        items: validLines.map(l => ({
          raw_material_id: parseInt(l.raw_material_id),
          quantity: parseFloat(l.quantity),
        })),
      })
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Gagal menghitung HPP.')
    } finally {
      setIsCalculating(false)
    }
  }

  // ── Terapkan HPP ke produk ─────────────────────────────────────────
  const handleApply = async () => {
    if (!selectedProductId || !result) return
    setIsApplying(true)
    try {
      await api.post('/hpp/apply', {
        product_id: parseInt(selectedProductId),
        hpp_per_portion: result.hpp_per_portion,
      })
      setApplySuccess(true)
      setTimeout(() => setApplySuccess(false), 4000)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Gagal menerapkan HPP.')
    } finally {
      setIsApplying(false)
    }
  }

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId))

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-16 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Memuat data bahan baku...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Panel 1: Setup ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-100 px-5 py-4 flex items-center gap-2">
          <Calculator size={20} className="text-blue-600" />
          <h2 className="text-base font-bold text-gray-800">Kalkulator HPP Produk</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Produk & Porsi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Produk Target <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full appearance-none border-2 border-gray-200 rounded-xl px-4 py-3 pr-10
                    focus:border-blue-500 focus:outline-none transition-colors text-sm font-medium bg-white cursor-pointer"
                >
                  <option value="">— Pilih menu (untuk terapkan HPP) —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (HPP saat ini: {formatRupiah(p.base_hpp)})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Jumlah Porsi / Pcs Dibuat
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={portions}
                onChange={e => setPortions(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
                  focus:border-blue-500 focus:outline-none transition-colors text-sm font-bold"
                placeholder="Contoh: 50"
              />
            </div>
          </div>

          {/* Tabel bahan baku */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700">Daftar Bahan Baku</label>
              <button
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-bold text-blue-600
                  hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} /> Tambah Bahan
              </button>
            </div>

            <div className="space-y-2">
              {/* Header kolom */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_100px_36px] gap-2 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase">Bahan Baku</span>
                <span className="text-xs font-bold text-gray-500 uppercase">Kuantitas</span>
                <span className="text-xs font-bold text-gray-500 uppercase text-right">Biaya</span>
                <span />
              </div>

              {lines.map((line, idx) => {
                const lineCost = getLineCost(line)
                const mat = rawMaterials.find(m => m.id === parseInt(line.raw_material_id))

                return (
                  <div key={idx} className="grid grid-cols-[1fr_120px_100px_36px] gap-2 items-center">
                    {/* Dropdown bahan */}
                    <div className="relative">
                      <select
                        value={line.raw_material_id}
                        onChange={e => updateLine(idx, 'raw_material_id', e.target.value)}
                        className="w-full appearance-none border-2 border-gray-200 rounded-xl px-3 py-2.5 pr-8
                          focus:border-blue-500 focus:outline-none text-sm bg-white cursor-pointer"
                      >
                        <option value="">Pilih bahan...</option>
                        {rawMaterials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit} — {formatRupiah(m.unit_hpp)}/{m.unit})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Input kuantitas */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        placeholder="0"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5
                          focus:border-blue-500 focus:outline-none text-sm font-bold text-right"
                      />
                      {mat && (
                        <span className="text-xs text-gray-400 shrink-0">{mat.unit}</span>
                      )}
                    </div>

                    {/* Preview biaya */}
                    <div className="text-right">
                      {lineCost !== null ? (
                        <span className="text-sm font-bold text-blue-700">
                          {formatRupiah(lineCost)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* Hapus baris */}
                    <button
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                        rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Hapus baris"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              disabled:bg-gray-300 disabled:cursor-not-allowed
              text-white font-bold py-3.5 rounded-xl transition-colors shadow-md
              flex items-center justify-center gap-2"
          >
            {isCalculating
              ? <><Loader2 size={16} className="animate-spin" /> Menghitung...</>
              : <><Calculator size={16} /> Hitung HPP</>
            }
          </button>
        </div>
      </div>

      {/* ── Panel 2: Hasil kalkulasi ── */}
      {result && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="bg-blue-600 px-5 py-4">
            <h3 className="text-base font-bold text-white">Hasil Kalkulasi HPP</h3>
            <p className="text-blue-200 text-xs mt-0.5">
              Untuk {result.portions} porsi
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Breakdown bahan */}
            <div className="space-y-1.5">
              {result.lines.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{line.name}</p>
                    <p className="text-xs text-gray-400">
                      {line.quantity} {line.unit} × {formatRupiah(line.unit_hpp)}/{line.unit}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{formatRupiah(line.line_cost)}</p>
                </div>
              ))}
            </div>

            {/* Ringkasan */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Biaya Bahan</span>
                <span className="font-bold">{formatRupiah(result.total_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Jumlah Porsi</span>
                <span className="font-bold">{result.portions} pcs</span>
              </div>
              <div className="flex justify-between text-base border-t border-blue-200 pt-2 mt-2">
                <span className="font-bold text-blue-800">HPP per Porsi</span>
                <span className="font-black text-blue-700 text-lg">
                  {formatRupiah(result.hpp_per_portion)}
                </span>
              </div>

              {/* Margin vs harga jual */}
              {selectedProduct && (
                <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                  <span className="text-gray-600">
                    Margin vs Harga Jual ({formatRupiah(selectedProduct.selling_price)})
                  </span>
                  <span className={`font-bold ${
                    selectedProduct.selling_price - result.hpp_per_portion >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatRupiah(selectedProduct.selling_price - result.hpp_per_portion)}
                  </span>
                </div>
              )}
            </div>

            {/* Tombol terapkan */}
            {selectedProductId ? (
              <button
                onClick={handleApply}
                disabled={isApplying || applySuccess}
                className={`w-full font-bold py-3.5 rounded-xl transition-colors shadow-md
                  flex items-center justify-center gap-2
                  ${applySuccess
                    ? 'bg-green-500 text-white cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                  }`}
              >
                {applySuccess
                  ? <><CheckCircle2 size={16} /> HPP Berhasil Diterapkan!</>
                  : isApplying
                    ? <><Loader2 size={16} className="animate-spin" /> Menerapkan...</>
                    : <>Terapkan HPP ke "{selectedProduct?.name}"</>
                }
              </button>
            ) : (
              <p className="text-center text-sm text-gray-400 py-2">
                Pilih produk di atas untuk menerapkan HPP ini ke menu.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
