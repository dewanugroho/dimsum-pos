import { useState } from 'react'
import { Clock, User } from 'lucide-react'
import { formatRupiah } from '../../format.js'

/**
 * ProductGrid — menampilkan produk dalam grid responsif grouped by kategori.
 *
 * Desktop : 3 kolom
 * Tablet  : 2 kolom
 * Mobile  : 2 kolom (card lebih compact)
 *
 * Props:
 *   groupedProducts  { [categoryName]: Product[] }
 *   cart             CartItem[]  — untuk highlight produk yang sudah di cart
 *   loading          boolean
 *   onAddToCart      (product) => void
 */
export default function ProductGrid({ groupedProducts, cart, loading, onAddToCart }) {
  // ── Filter tab kategori (mobile-friendly) ────────────────────────────
  const categories = Object.keys(groupedProducts)
  const [activeCategory, setActiveCategory] = useState(null) // null = tampilkan semua

  // Real-time clock
  const [now, setNow] = useState(new Date())
  useState(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  })

  const displayedGroups =
    activeCategory
      ? { [activeCategory]: groupedProducts[activeCategory] }
      : groupedProducts

  const cartMap = cart.reduce((acc, i) => {
    acc[i.product_id] = i.quantity
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Memuat menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gray-100 px-4 pt-4 pb-2">
        {/* Info kasir + jam */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600">
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold leading-none">Kasir Aktif</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">Dimsum Gembul</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-sm font-black text-slate-800 font-mono tabular-nums">
                {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <Clock size={20} className="text-slate-400" />
          </div>
        </div>

        {/* Tab filter kategori */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeCategory === null
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
              }`}
            >
              Semua
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid Produk ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 mt-2">
        {Object.entries(displayedGroups).map(([categoryName, items]) => (
          <section key={categoryName}>
            {/* Judul kategori */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-5 bg-orange-500 rounded-full shrink-0" />
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                {categoryName}
              </h2>
            </div>

            {/* Responsive grid: 2 kolom mobile/tablet, 3 kolom desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(product => {
                const qtyInCart = cartMap[product.id] || 0
                const outOfStock = product.stock_quantity < 1
                const lowStock = product.stock_quantity > 0 && product.stock_quantity < 15

                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && onAddToCart(product)}
                    disabled={outOfStock}
                    aria-label={`Tambah ${product.name} ke keranjang`}
                    className={`relative text-left bg-white rounded-xl shadow-sm border transition-all
                      ${outOfStock
                        ? 'opacity-50 cursor-not-allowed border-gray-100'
                        : 'hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer border-gray-200'
                      }
                      ${qtyInCart > 0 ? 'ring-2 ring-orange-400 border-transparent' : ''}
                    `}
                  >
                    {/* Badge stok menipis */}
                    {lowStock && !outOfStock && (
                      <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-red-200 animate-pulse z-10">
                        SISA {product.stock_quantity}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-2 right-2 bg-gray-100 text-gray-500 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-gray-200 z-10">
                        HABIS
                      </span>
                    )}

                    {/* Badge qty di cart */}
                    {qtyInCart > 0 && (
                      <span className="absolute -top-2 -left-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md z-10">
                        {qtyInCart}
                      </span>
                    )}

                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 leading-snug line-clamp-2 pr-8">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex flex-col gap-0.5">
                        <p className="text-orange-600 font-bold text-sm sm:text-base">
                          {formatRupiah(product.selling_price)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Stok: {product.stock_quantity}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {Object.keys(displayedGroups).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🍱</p>
            <p className="font-medium">Tidak ada menu tersedia</p>
          </div>
        )}
      </div>
    </div>
  )
}
