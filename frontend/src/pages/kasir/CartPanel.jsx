import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { formatRupiah } from '../../format.js'

/**
 * CartPanel — menampilkan keranjang belanja.
 *
 * Desktop (lg+) : sidebar kanan fixed, selalu terlihat.
 * Mobile/Tablet  : bottom sheet — bar ringkasan selalu terlihat di bawah,
 *                  bisa di-expand untuk melihat item detail.
 *
 * Props:
 *   cart           CartItem[]
 *   totalAmount    number
 *   cartItemCount  number
 *   onIncrease     (product) => void  — perlu object product lengkap untuk cek max_stock
 *   onDecrease     (productId) => void
 *   onRemove       (productId) => void
 *   onCheckout     () => void
 *   products       Product[]  — digunakan untuk rebuild product object saat onIncrease
 */
export default function CartPanel({
  cart,
  totalAmount,
  cartItemCount,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
  products,
}) {
  // Kontrol expand/collapse bottom sheet (mobile only)
  const [isExpanded, setIsExpanded] = useState(false)

  // Helper: rebuild product object dari products array untuk onIncrease
  const getProduct = (productId) =>
    products.find(p => p.id === productId) || null

  const handleIncrease = (item) => {
    const product = getProduct(item.product_id)
    if (product) onIncrease(product)
  }

  // ── KONTEN DAFTAR ITEM (shared antara sidebar & bottom sheet) ─────────
  const CartItemList = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
          <ShoppingCart size={40} className="mb-3 opacity-20" />
          <p className="text-sm">Belum ada pesanan</p>
        </div>
      ) : (
        cart.map(item => (
          <div
            key={item.product_id}
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
          >
            {/* Info produk */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                {item.name}
              </p>
              <p className="text-orange-600 text-sm font-bold mt-0.5">
                {formatRupiah(item.price * item.quantity)}
              </p>
            </div>

            {/* Kontrol qty */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onDecrease(item.product_id)}
                aria-label={`Kurangi ${item.name}`}
                className="w-7 h-7 flex items-center justify-center bg-white shadow-sm rounded-full text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-black text-gray-800 tabular-nums text-sm">
                {item.quantity}
              </span>
              <button
                onClick={() => handleIncrease(item)}
                aria-label={`Tambah ${item.name}`}
                disabled={item.quantity >= item.max_stock}
                className="w-7 h-7 flex items-center justify-center bg-white shadow-sm rounded-full text-green-600 hover:bg-green-50 transition-colors border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => onRemove(item.product_id)}
                aria-label={`Hapus ${item.name} dari keranjang`}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors ml-1"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )

  // ── FOOTER TOTAL + BAYAR (shared) ─────────────────────────────────────
  const CartFooter = ({ compact = false }) => (
    <div className={`bg-white border-t border-gray-200 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex justify-between items-center mb-3">
        <span className={`font-semibold text-gray-700 ${compact ? 'text-base' : 'text-xl'}`}>
          Total
        </span>
        <span className={`font-black text-orange-600 ${compact ? 'text-lg' : 'text-2xl'}`}>
          {formatRupiah(totalAmount)}
        </span>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed
          text-white font-bold rounded-xl transition-colors shadow-md
          flex items-center justify-center gap-2
          py-3.5 text-base"
      >
        <ShoppingCart size={18} />
        PROSES PEMBAYARAN
      </button>
    </div>
  )

  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (lg ke atas)
          Selalu terlihat di kanan, tinggi penuh.
      ════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-80 xl:w-96 bg-white shadow-xl border-l border-gray-200 flex-col shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-orange-50 flex items-center gap-2">
          <ShoppingCart className="text-orange-600" size={22} />
          <h2 className="text-lg font-bold text-gray-800">Pesanan Saat Ini</h2>
          {cartItemCount > 0 && (
            <span className="ml-auto bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
              {cartItemCount}
            </span>
          )}
        </div>

        <CartItemList />
        <CartFooter />
      </aside>

      {/* ════════════════════════════════════════════════════════════
          MOBILE / TABLET BOTTOM SHEET (< lg)
          - Bar ringkasan SELALU terlihat di bagian bawah layar
          - Tap chevron / area bar untuk expand/collapse daftar item
      ════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20">
        {/* Panel yang dapat di-expand */}
        <div
          className={`bg-white shadow-2xl border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden
            ${isExpanded ? 'max-h-[70vh]' : 'max-h-0'}
          `}
        >
          {/* Daftar item — hanya tampil saat expanded */}
          <div className="max-h-[55vh] overflow-y-auto">
            <CartItemList />
          </div>
        </div>

        {/* Bar bawah — selalu terlihat, tap untuk toggle */}
        <div
          className="bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
        >
          {/* Tombol expand (hanya muncul bila ada item) */}
          {cart.length > 0 && (
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100 text-orange-700"
              aria-label={isExpanded ? 'Tutup detail keranjang' : 'Lihat detail keranjang'}
            >
              <span className="text-xs font-bold">
                {isExpanded ? 'Tutup detail' : `${cartItemCount} item dalam keranjang`}
              </span>
              {isExpanded
                ? <ChevronDown size={16} />
                : <ChevronUp size={16} />
              }
            </button>
          )}

          {/* Footer total + bayar */}
          <CartFooter compact />
        </div>
      </div>
    </>
  )
}
