import { CheckCircle2, Printer, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api.js'
import { formatRupiah } from '../../format.js'

/**
 * SuccessModal — muncul setelah transaksi CASH berhasil.
 *
 * Menampilkan:
 * - Nomor resi
 * - Kembalian (bila metode CASH)
 * - Tombol cetak struk (opsional, fetch detail transaksi dulu)
 * - Tombol tutup
 *
 * Props:
 *   transactionId  string
 *   change         number  (0 untuk QRIS)
 *   onClose        () => void
 *   onPrintReceipt (transactionDetail) => void
 */
export default function SuccessModal({ transactionId, change, onClose, onPrintReceipt }) {
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  const handlePrint = async () => {
    setLoadingReceipt(true)
    try {
      const res = await api.get(`/history/`)
      // Cari transaksi yang cocok dari history
      const trx = res.data.find(t => t.id === transactionId)
      if (trx) onPrintReceipt(trx)
    } catch (err) {
      console.error('Gagal memuat detail untuk struk:', err)
    } finally {
      setLoadingReceipt(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm animate-in zoom-in duration-200">

        {/* Header sukses */}
        <div className="bg-green-50 px-6 pt-8 pb-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl font-black text-green-800">Transaksi Berhasil!</h2>
          <p className="text-sm text-green-600 font-medium">{transactionId}</p>
        </div>

        {/* Detail */}
        <div className="px-6 py-5 space-y-3">
          {change > 0 && (
            <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-orange-700">Kembalian</span>
              <span className="text-2xl font-black text-orange-600">{formatRupiah(change)}</span>
            </div>
          )}
          {change === 0 && (
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-blue-700">Pas / QRIS</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handlePrint}
            disabled={loadingReceipt}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200
              text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            <Printer size={18} />
            {loadingReceipt ? 'Memuat...' : 'Cetak Struk'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600
              text-white font-bold py-3 rounded-xl transition-colors shadow-md"
          >
            <X size={18} />
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
