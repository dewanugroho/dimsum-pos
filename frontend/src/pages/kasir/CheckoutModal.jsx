import { useState, useEffect, useRef } from 'react'
import { X, Banknote, QrCode, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '../../api.js'
import { formatRupiah } from '../../format.js'

/**
 * CheckoutModal — modal pembayaran kasir.
 *
 * Flow CASH:
 *   Input nominal → hitung kembalian → POST /transactions/ → onSuccess({ id, change })
 *
 * Flow QRIS:
 *   POST /transactions/ → dapat payment_url & transaction_id
 *   → tampilkan link buka halaman QRIS
 *   → polling GET /transactions/{id} tiap 3 detik sampai status "Success"
 *   → onSuccess({ id, change: 0 })
 *
 * Props:
 *   cart          CartItem[]
 *   totalAmount   number
 *   onSuccess     ({ id, change }) => void
 *   onClose       () => void
 */
export default function CheckoutModal({ cart, totalAmount, onSuccess, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [cashInput, setCashInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // State QRIS
  const [qrisUrl, setQrisUrl] = useState(null)
  const [activeTransactionId, setActiveTransactionId] = useState(null)
  const [qrisStatus, setQrisStatus] = useState('idle') // 'idle' | 'polling' | 'success'

  const pollingRef = useRef(null)

  // Hapus polling saat modal ditutup
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // ── Polling QRIS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTransactionId || paymentMethod !== 'QRIS') return

    setQrisStatus('polling')

    pollingRef.current = setInterval(() => {
      api.get(`/transactions/${activeTransactionId}`)
        .then(res => {
          if (res.data.status === 'Success') {
            clearInterval(pollingRef.current)
            setQrisStatus('success')
            // Beri jeda sebentar agar user lihat animasi sukses sebelum modal tutup
            setTimeout(() => {
              onSuccess({ id: activeTransactionId, change: 0 })
            }, 1200)
          }
        })
        .catch(err => console.error('Polling error:', err))
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [activeTransactionId, paymentMethod, onSuccess])

  // ── Helpers ───────────────────────────────────────────────────────────
  const cashNumber = parseInt(cashInput.replace(/\D/g, ''), 10) || 0
  const change = cashNumber - totalAmount
  const cashValid = paymentMethod === 'QRIS' || cashNumber >= totalAmount

  // Format input nominal dengan titik ribuan
  const handleCashInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    const formatted = raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''
    setCashInput(formatted)
  }

  // Shortcut nominal
  const SHORTCUTS = [10000, 20000, 50000, 100000]
  const applyShortcut = (amount) => {
    const rounded = Math.ceil(totalAmount / amount) * amount
    setCashInput(rounded.toLocaleString('id-ID'))
  }

  // ── Submit transaksi ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!cashValid) {
      setError('Uang yang diberikan kurang dari total tagihan.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await api.post('/transactions/', {
        payment_method: paymentMethod,
        amount_paid: totalAmount,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })

      if (paymentMethod === 'CASH') {
        onSuccess({ id: res.data.id, change })
      } else {
        // QRIS: simpan URL & ID untuk polling
        setQrisUrl(res.data.payment_url)
        setActiveTransactionId(res.data.id)
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Gagal memproses transaksi. Cek koneksi server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  // Tampilan sukses QRIS (sebelum modal menutup)
  if (qrisStatus === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in duration-200">
          <CheckCircle2 size={64} className="text-green-500" />
          <p className="text-xl font-bold text-gray-800">Pembayaran QRIS Berhasil!</p>
          <p className="text-gray-500 text-sm">Memperbarui data...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !activeTransactionId) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <h2 className="text-lg font-bold text-gray-800">Proses Pembayaran</h2>
          {!activeTransactionId && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tutup"
            >
              <X size={22} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Ringkasan total */}
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-sm text-orange-700 font-medium mb-1">Total Tagihan</p>
            <p className="text-3xl font-black text-orange-600">{formatRupiah(totalAmount)}</p>
            <p className="text-xs text-orange-500 mt-1">{cart.length} item pesanan</p>
          </div>

          {/* Pilih metode (hanya saat belum submit QRIS) */}
          {!activeTransactionId && (
            <>
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'CASH', label: 'Tunai', icon: Banknote },
                    { value: 'QRIS', label: 'QRIS', icon: QrCode },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => { setPaymentMethod(value); setError(null) }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-bold transition-all
                        ${paymentMethod === value
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      <Icon size={26} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input nominal CASH */}
              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Uang Diterima
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashInput}
                      onChange={handleCashInput}
                      placeholder="0"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-right font-bold text-lg
                        focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Shortcut nominal */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {SHORTCUTS.map(amount => {
                      const rounded = Math.ceil(totalAmount / amount) * amount
                      return (
                        <button
                          key={amount}
                          onClick={() => applyShortcut(amount)}
                          className="text-xs bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {formatRupiah(rounded)}
                        </button>
                      )
                    })}
                  </div>

                  {/* Kembalian */}
                  {cashNumber > 0 && (
                    <div className={`mt-3 p-3 rounded-xl flex justify-between items-center font-bold
                      ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                    >
                      <span className="text-sm">Kembalian</span>
                      <span className="text-lg">
                        {change >= 0 ? formatRupiah(change) : `− ${formatRupiah(Math.abs(change))}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}

              {/* Tombol proses */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !cashValid}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  text-white font-bold py-4 rounded-xl text-base transition-colors shadow-md
                  flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                  : `Konfirmasi ${paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'}`
                }
              </button>
            </>
          )}

          {/* Status QRIS setelah transaksi dibuat */}
          {activeTransactionId && paymentMethod === 'QRIS' && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="bg-blue-50 rounded-xl p-4 text-center w-full">
                <QrCode size={48} className="mx-auto mb-2 text-blue-600" />
                <p className="font-bold text-blue-800 mb-1">QR Code Siap</p>
                <p className="text-xs text-blue-600">
                  Nomor Resi: <strong>{activeTransactionId}</strong>
                </p>
              </div>

              {qrisUrl && (
                <a
                  href={qrisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                    text-white font-bold py-3.5 rounded-xl transition-colors shadow-md"
                >
                  <ExternalLink size={18} />
                  Buka Halaman Pembayaran QRIS
                </a>
              )}

              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={16} className="animate-spin text-orange-500" />
                <span>Menunggu konfirmasi pembayaran...</span>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Halaman ini otomatis menutup setelah pembayaran berhasil dikonfirmasi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
