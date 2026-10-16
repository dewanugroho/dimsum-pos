import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../api.js'
import { CATEGORY_NAMES } from '../../format.js'
import ProductGrid from './ProductGrid.jsx'
import CartPanel from './CartPanel.jsx'
import CheckoutModal from './CheckoutModal.jsx'
import SuccessModal from './SuccessModal.jsx'
import ReceiptModal from '../../components/ReceiptModal.jsx'

/**
 * KasirPage — container utama halaman /kasir.
 *
 * Semua state global kasir ada di sini dan dioper ke child via props.
 * Tidak ada logic fetch di child — semua terpusat.
 */
export default function KasirPage() {
  // ── Data ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // ── Keranjang ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState([])

  // ── Modal states ──────────────────────────────────────────────────────
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [successData, setSuccessData] = useState(null)   // { id, change }
  const [receiptTrx, setReceiptTrx] = useState(null)     // transaksi untuk cetak struk

  // ── Audio kasir ───────────────────────────────────────────────────────
  const audioRef = useRef(null)

  // ── Fetch produk ──────────────────────────────────────────────────────
  const fetchProducts = useCallback(() => {
    setLoadingProducts(true)
    api.get('/products/')
      .then(res => setProducts(res.data))
      .catch(err => console.error('Gagal memuat produk:', err))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ── Grouped products untuk ProductGrid ───────────────────────────────
  const groupedProducts = (Array.isArray(products) ? products : []).reduce(
    (acc, product) => {
      if (!product.is_active) return acc
      const catName = CATEGORY_NAMES[product.category_id] || 'Lainnya'
      if (!acc[catName]) acc[catName] = []
      acc[catName].push(product)
      return acc
    },
    {},
  )

  // ── Cart actions ──────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    if (product.stock_quantity < 1) return
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          max_stock: product.stock_quantity,
        },
      ]
    })
  }, [])

  const decreaseFromCart = useCallback((productId) => {
    setCart(prev =>
      prev
        .map(i => i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0),
    )
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  // ── Checkout flow ─────────────────────────────────────────────────────
  const playKaching = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
  }

  const handleTransactionSuccess = useCallback(({ id, change }) => {
    playKaching()
    setSuccessData({ id, change })
    clearCart()
    fetchProducts()
  }, [clearCart, fetchProducts])

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Audio kasir — diinisialisasi diam agar browser izinkan play() nanti */}
      <audio
        ref={audioRef}
        src="https://www.soundjay.com/misc/sounds/cash-register-1.mp3"
        preload="auto"
      />

      {/* ── Kiri/Atas: Grid Produk ── */}
      <div className="flex-1 overflow-y-auto min-w-0 pb-[72px] lg:pb-0">
        <ProductGrid
          groupedProducts={groupedProducts}
          cart={cart}
          loading={loadingProducts}
          onAddToCart={addToCart}
        />
      </div>

      {/* ── Kanan (desktop): Sidebar Keranjang ── */}
      {/* Mobile: CartPanel mengatur bottom-sheet-nya sendiri */}
      <CartPanel
        cart={cart}
        totalAmount={totalAmount}
        cartItemCount={cartItemCount}
        onIncrease={addToCart}
        onDecrease={decreaseFromCart}
        onRemove={removeFromCart}
        onCheckout={() => setIsCheckoutOpen(true)}
        products={products}
      />

      {/* ── Modal Checkout ── */}
      {isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          totalAmount={totalAmount}
          onSuccess={handleTransactionSuccess}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}

      {/* ── Modal Sukses ── */}
      {successData && (
        <SuccessModal
          transactionId={successData.id}
          change={successData.change}
          onClose={() => setSuccessData(null)}
          onPrintReceipt={(trx) => {
            setSuccessData(null)
            setReceiptTrx(trx)
          }}
        />
      )}

      {/* ── Modal Cetak Struk ── */}
      {receiptTrx && (
        <ReceiptModal
          transaction={receiptTrx}
          onClose={() => setReceiptTrx(null)}
        />
      )}
    </div>
  )
}
