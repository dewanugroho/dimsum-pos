import { X, Printer } from 'lucide-react'
import { formatRupiah, formatDateTime } from '../format.js'

/**
 * ReceiptModal — modal cetak struk thermal 58mm.
 * Dipakai bersama oleh KasirPage dan OwnerPage (TransactionHistory).
 *
 * Props:
 *   transaction  {
 *     id, total_amount, payment_method, status,
 *     created_at, items_summary
 *   }
 *   onClose  () => void
 */
export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null

  const handlePrint = () => window.print()

  return (
    <>
      {/* ── CSS Print — hanya elemen #thermal-receipt yang dicetak ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #thermal-receipt-wrapper { display: block !important; position: fixed; inset: 0; }
          #thermal-receipt {
            width: 58mm;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            margin: 0;
            padding: 4mm;
          }
        }
        @media screen {
          #thermal-receipt-wrapper { display: none; }
        }
      `}</style>

      {/* Wrapper cetak (hidden di screen, tampil saat print) */}
      <div id="thermal-receipt-wrapper">
        <div id="thermal-receipt">
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>DIMSUM GEMBUL</p>
            <p style={{ fontSize: '8pt' }}>Struk Pembelian</p>
            <p style={{ fontSize: '8pt' }}>================================</p>
          </div>

          <p style={{ fontSize: '8pt' }}>No   : {transaction.id}</p>
          <p style={{ fontSize: '8pt' }}>Waktu: {formatDateTime(transaction.created_at)}</p>
          <p style={{ fontSize: '8pt' }}>Bayar: {transaction.payment_method}</p>
          <p style={{ fontSize: '8pt' }}>================================</p>

          <p style={{ fontSize: '9pt', whiteSpace: 'pre-wrap' }}>
            {transaction.items_summary}
          </p>

          <p style={{ fontSize: '8pt' }}>================================</p>
          <p style={{ fontWeight: 'bold', fontSize: '11pt', textAlign: 'right' }}>
            TOTAL: {formatRupiah(transaction.total_amount)}
          </p>
          <p style={{ fontSize: '8pt', textAlign: 'center', marginTop: '4mm' }}>
            Terima kasih sudah mampir!
          </p>
        </div>
      </div>

      {/* ── Modal UI (screen only) ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
            <h2 className="text-base font-bold text-gray-800">Struk Transaksi</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          {/* Preview struk */}
          <div className="p-5 font-mono text-xs bg-gray-50 space-y-1">
            <p className="text-center font-bold text-sm">DIMSUM GEMBUL</p>
            <p className="text-center text-gray-500 text-[10px]">Struk Pembelian</p>
            <p className="text-center text-gray-300">{'='.repeat(32)}</p>
            <p><span className="text-gray-500">No   :</span> {transaction.id}</p>
            <p><span className="text-gray-500">Waktu:</span> {formatDateTime(transaction.created_at)}</p>
            <p><span className="text-gray-500">Bayar:</span> {transaction.payment_method}</p>
            <p className="text-gray-300">{'='.repeat(32)}</p>
            <p className="text-gray-700 whitespace-pre-wrap">{transaction.items_summary}</p>
            <p className="text-gray-300">{'='.repeat(32)}</p>
            <p className="text-right font-bold text-base text-gray-800">
              TOTAL: {formatRupiah(transaction.total_amount)}
            </p>
            <p className="text-center text-gray-400 text-[10px] pt-2">
              Terima kasih sudah mampir!
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900
                text-white font-bold rounded-xl transition-colors shadow-md"
            >
              <Printer size={16} />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
