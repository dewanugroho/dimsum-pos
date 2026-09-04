import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { ShoppingCart, Plus, Minus, Trash2, BarChart3, Store, Lock, Package, X, QrCode, Banknote, Edit2, Check, Tags, PlusCircle, Clock, User, Printer, CheckCircle, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function App() {
  const [activeTab, setActiveTab] = useState('pos')
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [report, setReport] = useState({ total_revenue: 0, total_hpp: 0, net_profit: 0, total_items_sold: 0 })
  const [isReportUnlocked, setIsReportUnlocked] = useState(false)
  const [warehouse, setWarehouse] = useState([])
  const [history, setHistory] = useState([])
  const [authToken, setAuthToken] = useState(null) 

  // --- DATA GRAFIK ANALITIK OWNER ---
  const weeklySalesData = [
    { name: 'Sen', Omzet: 450000 }, { name: 'Sel', Omzet: 520000 },
    { name: 'Rab', Omzet: 480000 }, { name: 'Kam', Omzet: 610000 },
    { name: 'Jum', Omzet: 750000 }, { name: 'Sab', Omzet: 950000 },
    { name: 'Min', Omzet: 1100000 },
  ]

  // --- MESIN WAKTU REAL-TIME ---
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // --- EFEK SUARA KASIR (VERSI REACT DOM) ---
  const playKaching = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; 
      audioRef.current.play().catch(e => console.log("Gagal memutar audio:", e));
    }
  }

  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [successModal, setSuccessModal] = useState(null)
  const audioRef = useRef(null)

  // --- STATE PENGELUARAN ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')

  const submitExpense = (e) => {
    e.preventDefault()
    alert(`BERHASIL DICATAT!\nPengeluaran: ${expenseDesc}\nNominal: Rp ${parseInt(expenseAmount).toLocaleString('id-ID')}`)
    setExpenseDesc('')
    setExpenseAmount('')
    setIsExpenseModalOpen(false)
  }

  // State Kasir & Pembayaran
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("QRIS")
  const [cashGiven, setCashGiven] = useState("")
  
  // --- STATE BARU: MIDTRANS QRIS ---
  const [qrUrl, setQrUrl] = useState(null)
  const [activeTransactionId, setActiveTransactionId] = useState(null)

  // State Edit Stok & Manajemen Menu
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editStockValue, setEditStockValue] = useState("")
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [menuForm, setMenuForm] = useState({ id: null, name: '', category_id: 1, selling_price: 0, base_hpp: 0, stock_quantity: 100 })

  const fetchProducts = () => axios.get('http://127.0.0.1:8000/products/').then(res => setProducts(res.data)).catch(console.error)
  const fetchHistory = () => axios.get('http://127.0.0.1:8000/history/').then(res => setHistory(res.data)).catch(console.error)
  
  // FUNGSI YANG DIKUNCI (Wajib bawa token)
  const fetchReport = (token = authToken) => {
    if (!token) return;
    axios.get('http://127.0.0.1:8000/reports/summary/', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setReport(res.data)).catch(console.error)
  }
  
  const fetchWarehouse = (token = authToken) => {
    if (!token) return;
    axios.get('http://127.0.0.1:8000/warehouse/', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setWarehouse(res.data)).catch(console.error)
  }

  useEffect(() => { fetchProducts(); fetchReport(); fetchWarehouse(); fetchHistory(); }, [])

  // --- LOGIKA RADAR (POLLING) QRIS ---
  useEffect(() => {
    let interval;
    if (activeTransactionId && paymentMethod === "QRIS") {
      interval = setInterval(() => {
        axios.get(`http://127.0.0.1:8000/transactions/${activeTransactionId}`)
          .then(res => {
            if (res.data.status === "Success") {
              clearInterval(interval)
              alert(`TING! SUKSES!\nPembayaran QRIS Berhasil Masuk.\nNomor Resi: ${res.data.id}`)
              resetCheckout()
              fetchProducts()
              if (isReportUnlocked) { fetchReport(); fetchWarehouse(); fetchHistory() }
            }
          })
          .catch(console.error)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [activeTransactionId, paymentMethod, isReportUnlocked])

  const handleReportClick = () => {
    if (isReportUnlocked) {
      setActiveTab('report')
      fetchReport(); fetchWarehouse(); fetchHistory();
    } else {
      setIsPinModalOpen(true)
      setPinError(false)
      setPinInput("")
    }
  }

  const submitPin = async (e) => {
    e.preventDefault() 
    try {
      // 1. Tembak PIN ke Backend
      const res = await axios.post('http://127.0.0.1:8000/verify-pin', { pin: pinInput })
      
      // 2. Jika sukses, Backend memberi Token JWT
      const token = res.data.access_token
      setAuthToken(token) // Simpan token di memori
      
      // 3. Buka brankas dan panggil data menggunakan token tersebut
      setIsReportUnlocked(true)
      setActiveTab('report')
      setIsPinModalOpen(false) 
      fetchReport(token); fetchWarehouse(token); fetchHistory();
      
    } catch (err) {
      // Jika Backend bilang PIN salah (401 Unauthorized)
      setPinError(true)
      setPinInput("") 
    }
  }

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id)
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) { alert(`Stok ${product.name} tidak cukup!`); return prevCart }
        return prevCart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      } 
      if (product.stock_quantity < 1) { alert("Mohon maaf, stok habis!"); return prevCart }
      return [...prevCart, { product_id: product.id, name: product.name, price: product.selling_price, quantity: 1, max_stock: product.stock_quantity }]
    })
  }

  const removeFromCart = (productId, removeAll = false) => {
    setCart(prevCart => {
      if (removeAll) return prevCart.filter(item => item.product_id !== productId)
      return prevCart.map(item => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0)
    })
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cashGivenNumber = parseInt(cashGiven.replace(/\D/g, '')) || 0
  const changeAmount = cashGivenNumber - totalAmount

  const resetCheckout = () => {
    setCart([])
    setQrUrl(null)
    setActiveTransactionId(null)
    setIsCheckoutModalOpen(false)
  }

  const openCheckoutModal = () => {
    if (cart.length === 0) return alert("Keranjang masih kosong, Dewa!")
    setCashGiven("")
    setQrUrl(null)
    setActiveTransactionId(null)
    setIsCheckoutModalOpen(true)
  }

  const submitTransaction = () => {
    if (audioRef.current) {
      audioRef.current.muted = true; 
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.muted = false; 
        audioRef.current.currentTime = 0;
      }).catch(err => console.log("Audio standby."));
    }

    if (paymentMethod === "CASH" && cashGivenNumber < totalAmount) return alert("Uang pelanggan kurang!")
    
    axios.post('http://127.0.0.1:8000/transactions/', {
      payment_method: paymentMethod, 
      amount_paid: totalAmount, 
      items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
    }).then(res => {
      if (paymentMethod === "QRIS") {
        setQrUrl(res.data.qr_url)
        setActiveTransactionId(res.data.id)
      } else {
        playKaching() 
        setSuccessModal({ id: res.data.id, change: changeAmount })
        resetCheckout()
        fetchProducts()
        if (isReportUnlocked) { fetchReport(); fetchWarehouse(); fetchHistory() }
      }
    }).catch(err => {
      alert("Gagal melakukan transaksi. Cek koneksi server!")
      console.error(err)
    })
  }

  const handleSaveStock = (id) => {
    const newStock = parseFloat(editStockValue)
    if (isNaN(newStock) || newStock < 0) return alert("Masukkan angka yang valid!")
    axios.put(`http://127.0.0.1:8000/warehouse/${id}`, { new_stock: newStock })
      .then(() => { setEditingMaterialId(null); fetchWarehouse(); })
      .catch(err => alert("Gagal mengupdate stok."))
  }

  const openMenuModal = (product = null) => {
    if (product) setMenuForm(product)
    else setMenuForm({ id: null, name: '', category_id: 1, selling_price: 0, base_hpp: 0, stock_quantity: 100 })
    setIsMenuModalOpen(true)
  }

  const saveMenuForm = (e) => {
    e.preventDefault()
    const endpoint = menuForm.id ? `http://127.0.0.1:8000/products/${menuForm.id}` : `http://127.0.0.1:8000/products/`
    const method = menuForm.id ? axios.put : axios.post
    method(endpoint, menuForm).then(() => { alert("Data menu berhasil disimpan!"); setIsMenuModalOpen(false); fetchProducts(); }).catch(err => alert("Gagal menyimpan menu."))
  }

  const deleteMenu = (id) => {
    if(window.confirm("Yakin ingin menghapus menu ini?")) {
      axios.delete(`http://127.0.0.1:8000/products/${id}`).then(() => fetchProducts()).catch(err => alert("Gagal menghapus menu."))
    }
  }

  const categoryNames = {
    1: "Varian Dimsum Satuan", 2: "Paket Dimsum Mentai", 3: "Paket Dimsum Bolognese",
    4: "Paket Dimsum Saus Keju", 5: "Paket Dimsum Carbonara", 6: "Ekstra Saus & Pelengkap"
  }

  const groupedProducts = products.reduce((acc, product) => {
    const catName = categoryNames[product.category_id] || "Kategori Lainnya"
    if (!acc[catName]) acc[catName] = []
    acc[catName].push(product)
    return acc
  }, {})

  return (
    <div className="flex h-screen bg-gray-100 font-sans relative">

      {/* SIDEBAR NAVIGASI */}
      <div className="w-20 bg-slate-900 text-white flex flex-col items-center py-6 gap-6 z-10">
        <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Kasir"><Store size={24} /></button>
        {/* TOMBOL CATAT PENGELUARAN (UNTUK IBU) */}
        <button 
          onClick={() => setIsExpenseModalOpen(true)}
          className={`p-4 rounded-xl transition-all ${
            isExpenseModalOpen ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title="Catat Belanja/Pengeluaran"
        >
          <Wallet size={24} />
        </button>
        <button onClick={handleReportClick} className={`p-3 rounded-xl transition-all relative ${activeTab === 'report' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Laporan & Gudang"><BarChart3 size={24} />{!isReportUnlocked && <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1"><Lock size={10} className="text-white" /></div>}</button>
      </div>

      {activeTab === 'pos' ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-2/3 p-6 overflow-y-auto">
            {/* HEADER REAL-TIME KASIR */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 w-full">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Kasir Aktif</p>
                  <p className="text-sm font-bold text-gray-800">Dewa (Owner)</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-slate-50 py-2 px-4 rounded-xl border border-slate-100">
                <div className="flex flex-col items-end">
                  <p className="text-sm font-black text-slate-800 font-mono tracking-wider">{formattedTime}</p>
                  <p className="text-xs text-slate-500 font-medium">{formattedDate}</p>
                </div>
                <div className="text-slate-400">
                  <Clock size={24} />
                </div>
              </div>
            </div>
            {/* ======================== */}
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Kasir Dimsum Gembul</h1>
            <div className="space-y-8 pb-10">
              {Object.entries(groupedProducts).map(([categoryName, items]) => (
                <div key={categoryName}>
                  <h2 className="text-xl font-bold text-slate-700 mb-4 border-b-2 border-orange-200 pb-2 flex items-center gap-2"><span className="w-2 h-6 bg-orange-500 rounded-full"></span>{categoryName}</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {items.map((product) => (
                      <div key={product.id} onClick={() => addToCart(product)} className="relative bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer border border-gray-200 transition-all active:scale-95 flex flex-col justify-between overflow-hidden">
                        {/* INDIKATOR STOK MENIPIS */}
                        {product.stock_quantity < 15 && (
                          <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full border border-red-200 animate-pulse z-10 shadow-sm">
                            SISA {product.stock_quantity}
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-700 leading-tight pr-12">{product.name}</h3>
                        <div className="mt-3">
                          <p className="text-orange-600 font-bold">Rp {product.selling_price.toLocaleString('id-ID')}</p>
                          <p className="text-xs text-gray-400 mt-1">Sisa Stok: {product.stock_quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/3 bg-white shadow-xl flex flex-col border-l border-gray-200 z-10">
            <div className="p-6 border-b flex items-center gap-2 bg-orange-50"><ShoppingCart className="text-orange-600" size={24} /><h2 className="text-xl font-bold text-gray-800">Pesanan Saat Ini</h2></div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400"><ShoppingCart size={48} className="mb-4 opacity-20" /><p>Belum ada pesanan</p></div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                      <div className="flex-1"><p className="font-semibold text-gray-800 leading-tight">{item.name}</p><p className="text-orange-600 text-sm font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.product_id)} className="p-1 bg-white shadow-sm rounded-full text-red-500 hover:bg-red-50"><Minus size={16}/></button><span className="font-bold w-4 text-center">{item.quantity}</span><button onClick={() => addToCart({id: item.product_id, name: item.name, selling_price: item.price, stock_quantity: item.max_stock})} className="p-1 bg-white shadow-sm rounded-full text-green-500 hover:bg-green-50"><Plus size={16}/></button><button onClick={() => removeFromCart(item.product_id, true)} className="ml-1 text-gray-400 hover:text-red-500" title="Hapus"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between text-2xl font-bold mb-4"><span className="text-gray-800">Total:</span><span className="text-orange-600">Rp {totalAmount.toLocaleString('id-ID')}</span></div>
              <button onClick={openCheckoutModal} className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-4 px-4 rounded-xl text-lg transition-colors shadow-md flex justify-center items-center gap-2">PROSES PEMBAYARAN</button>
            </div>
          </div>
        </div>
      ) : (
        /* --- DASHBOARD PEMILIK --- */
        <div className="flex-1 p-8 overflow-y-auto relative bg-gray-50">
          <button onClick={() => {setIsReportUnlocked(false); setActiveTab('pos');}} className="absolute top-8 right-8 flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-semibold transition-colors"><Lock size={16} /> Kunci Kembali</button>
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard Pemilik</h1>
          
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500 font-medium">Total Omzet Penjualan</p><p className="text-2xl font-bold text-gray-800 mt-2">Rp {report.total_revenue.toLocaleString('id-ID')}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500 font-medium">Total Estimasi HPP (Modal)</p><p className="text-2xl font-bold text-red-500 mt-2">Rp {report.total_hpp.toLocaleString('id-ID')}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500 font-medium">Estimasi Laba Bersih</p><p className="text-2xl font-bold text-green-600 mt-2">Rp {report.net_profit.toLocaleString('id-ID')}</p></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500 font-medium">Total Produk Terjual</p><p className="text-2xl font-bold text-blue-600 mt-2">{report.total_items_sold} Pcs</p></div>
          </div>

          {/* ===== GRAFIK PERGERAKAN OMZET (OWNER) ===== */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">Pergerakan Omzet Mingguan</h3>
                <p className="text-sm text-slate-500 font-medium">Pemantauan arus kas Dimsum Gembul</p>
              </div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
                +15.4% vs Minggu Lalu
              </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySalesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `Rp${val/1000}k`} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Omzet" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* =========================================== */}

          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><div className="p-6 border-b border-gray-200 flex items-center justify-between bg-slate-50"><div className="flex items-center gap-2"><Package className="text-slate-700" size={24} /><h2 className="text-xl font-bold text-gray-800">Gudang Bahan Baku</h2></div></div><div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-left border-collapse"><thead className="bg-white sticky top-0 shadow-sm"><tr><th className="p-4 font-semibold text-gray-600 border-b">Nama Bahan Baku</th><th className="p-4 font-semibold text-gray-600 border-b text-center">Stok</th><th className="p-4 font-semibold text-gray-600 border-b">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100">{warehouse.map((item) => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 text-gray-800 font-medium">{item.name}</td><td className="p-4 text-center">{editingMaterialId === item.id ? (<input type="number" value={editStockValue} onChange={(e) => setEditStockValue(e.target.value)} className="w-20 border-2 border-blue-400 p-1 rounded font-bold text-center" autoFocus />) : (<span className={`font-bold ${item.stock_quantity < 10 ? 'text-red-500' : 'text-green-600'}`}>{item.stock_quantity} {item.unit}</span>)}</td><td className="p-4">{editingMaterialId === item.id ? (<div className="flex gap-2"><button onClick={() => handleSaveStock(item.id)} className="bg-green-500 text-white p-2 rounded-lg"><Check size={16} /></button><button onClick={() => setEditingMaterialId(null)} className="bg-gray-200 text-gray-600 p-2 rounded-lg"><X size={16} /></button></div>) : (<button onClick={() => { setEditingMaterialId(item.id); setEditStockValue(item.stock_quantity); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Edit2 size={16} /></button>)}</td></tr>))}</tbody></table></div></div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><div className="p-6 border-b border-gray-200 flex items-center justify-between bg-slate-50"><div className="flex items-center gap-2"><Tags className="text-slate-700" size={24} /><h2 className="text-xl font-bold text-gray-800">Master Menu (Produk)</h2></div><button onClick={() => openMenuModal()} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm transition-colors"><PlusCircle size={16} /> Tambah Menu</button></div><div className="overflow-x-auto max-h-[500px] overflow-y-auto"><table className="w-full text-left border-collapse"><thead className="bg-white sticky top-0 shadow-sm"><tr><th className="p-4 font-semibold text-gray-600 border-b">Menu & Harga</th><th className="p-4 font-semibold text-gray-600 border-b">HPP</th><th className="p-4 font-semibold text-gray-600 border-b text-center">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100">{products.map((product) => (<tr key={product.id} className="hover:bg-slate-50 transition-colors"><td className="p-4"><p className="font-bold text-gray-800">{product.name}</p><p className="text-orange-600 text-sm font-semibold mt-1">Rp {product.selling_price.toLocaleString('id-ID')}</p></td><td className="p-4 text-gray-500 font-medium">Rp {product.base_hpp.toLocaleString('id-ID')}</td><td className="p-4"><div className="flex justify-center gap-2"><button onClick={() => openMenuModal(product)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors" title="Edit Data"><Edit2 size={18} /></button><button onClick={() => deleteMenu(product.id)} className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-colors" title="Hapus Permanen"><Trash2 size={18} /></button></div></td></tr>))}</tbody></table></div></div>
          </div>
          {/* TABEL RIWAYAT TRANSAKSI */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Banknote className="text-slate-700" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Riwayat Transaksi Penjualan</h2>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 shadow-sm">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600 border-b">Waktu & Order ID</th>
                    <th className="p-4 font-semibold text-gray-600 border-b">Rincian Pesanan</th>
                    <th className="p-4 font-semibold text-gray-600 border-b text-center">Metode</th>
                    <th className="p-4 font-semibold text-gray-600 border-b text-right">Total Tagihan</th>
                    <th className="p-4 font-semibold text-gray-600 border-b text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">Belum ada riwayat transaksi.</td></tr>
                  ) : (
                    history.map((trx) => (
                      <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="text-xs text-gray-500 font-mono">{trx.id.replace('TRX-', '')}</p>
                          <p className="font-bold text-gray-800 text-sm">{trx.id}</p>
                        </td>
                        <td className="p-4 text-gray-600 text-sm font-medium">{trx.items_summary}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${trx.payment_method === 'QRIS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {trx.payment_method}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-gray-800">Rp {trx.total_amount.toLocaleString('id-ID')}</td>
                        <td className="p-4 flex items-center justify-center gap-2">
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${trx.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {trx.status === 'Success' ? 'LUNAS' : 'PENDING'}
    </span>
    {trx.status === 'Success' && (
      <button 
        onClick={() => setSelectedReceipt(trx)} 
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
        title="Cetak Struk"
      >
        <Printer size={16} />
      </button>
    )}
  </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP FORMULIR TAMBAH/EDIT MENU */}
      {isMenuModalOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"><div className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"><div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold text-gray-800">{menuForm.id ? "Edit Menu Produk" : "Tambah Menu Baru"}</h2><button onClick={() => setIsMenuModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button></div><form onSubmit={saveMenuForm} className="p-6 space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Nama Menu</label><input type="text" required value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" placeholder="Contoh: Dimsum Mozzarella" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label><select value={menuForm.category_id} onChange={e => setMenuForm({...menuForm, category_id: parseInt(e.target.value)})} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none bg-white">{Object.entries(categoryNames).map(([id, name]) => (<option key={id} value={id}>{name}</option>))}</select></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Stok Display</label><input type="number" required value={menuForm.stock_quantity} onChange={e => setMenuForm({...menuForm, stock_quantity: parseFloat(e.target.value)})} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Harga Jual (Rp)</label><input type="number" required value={menuForm.selling_price} onChange={e => setMenuForm({...menuForm, selling_price: parseFloat(e.target.value)})} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">HPP / Modal (Rp)</label><input type="number" required value={menuForm.base_hpp} onChange={e => setMenuForm({...menuForm, base_hpp: parseFloat(e.target.value)})} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" /></div></div><div className="pt-4 flex gap-4 mt-4"><button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button><button type="submit" className="flex-1 py-3 font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md">Simpan Menu</button></div></form></div></div>
      )}

      {/* POP-UP PEMBAYARAN KASIR */}
      {isCheckoutModalOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-bold text-gray-800">Penyelesaian Transaksi</h2>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <div className="p-8 flex-1">
              <div className="text-center mb-8">
                <p className="text-gray-500 font-medium mb-1">Total Tagihan Pelanggan</p>
                <p className="text-4xl font-black text-orange-600">Rp {totalAmount.toLocaleString('id-ID')}</p>
              </div>
              
              {!qrUrl && (
                <div className="flex gap-4 mb-6">
                  <button onClick={() => {setPaymentMethod("QRIS"); setCashGiven("");}} className={`flex-1 py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-2 ${paymentMethod === "QRIS" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-400"}`}><QrCode size={28} /> QRIS</button>
                  <button onClick={() => setPaymentMethod("CASH")} className={`flex-1 py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-2 ${paymentMethod === "CASH" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-400"}`}><Banknote size={28} /> TUNAI (CASH)</button>
                </div>
              )}

              {paymentMethod === "CASH" && (
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <label className="block text-sm font-bold text-green-800 mb-2">Nominal Uang Diterima (Rp)</label>
                  <input type="number" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder="Contoh: 50000" className="w-full text-2xl font-bold p-3 rounded-lg border-2 border-green-200 focus:border-green-500 bg-white mb-4" autoFocus/>
                  <div className="flex justify-between items-center pt-4 border-t border-green-200"><span className="font-semibold text-green-800">Kembalian:</span><span className={`text-2xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-700'}`}>{changeAmount < 0 ? 'Uang Kurang' : `Rp ${changeAmount.toLocaleString('id-ID')}`}</span></div>
                </div>
              )}

              {paymentMethod === "QRIS" && (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                  {qrUrl ? (
                    <>
                      <div className="bg-white p-5 rounded-xl border border-blue-200 mb-4 shadow-sm w-full">
                         <p className="text-gray-700 font-bold mb-4">Tagihan Midtrans Berhasil Dibuat!</p>
                         <a href={qrUrl} target="_blank" rel="noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition-all shadow-md">
                            BUKA HALAMAN PEMBAYARAN
                         </a>
                      </div>
                      <p className="text-blue-800 font-bold animate-pulse">Menunggu Anda menyelesaikan pembayaran...</p>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-xl border border-blue-200 mb-3"><QrCode size={80} className="text-blue-600" /></div>
                      <p className="text-blue-800 font-medium">Klik tombol di bawah untuk membuat Link Pembayaran.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
              <button onClick={() => setIsCheckoutModalOpen(false)} className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl">BATAL</button>
              <button 
                onClick={submitTransaction} 
                disabled={(paymentMethod === "CASH" && cashGivenNumber < totalAmount) || qrUrl !== null} 
                className="flex-[2] py-3 font-bold text-white bg-orange-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentMethod === "QRIS" ? (qrUrl ? "MENUNGGU SALDO MASUK..." : "TAMPILKAN QRIS") : "KONFIRMASI LUNAS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POP-UP CATAT PENGELUARAN (IBU) ===== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-500 p-6 flex flex-col items-center text-white relative">
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full p-1"
              >
                <X size={20} />
              </button>
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm text-red-500">
                <Wallet size={28} />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Catat Pengeluaran</h3>
              <p className="text-red-100 text-sm mt-1 text-center">Bahan baku, saus mentai, mika, dll.</p>
            </div>

            <div className="p-8">
              <form onSubmit={submitExpense}>
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nama Barang / Keperluan</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="Contoh: Beli ayam 5kg"
                    className="w-full p-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-red-500 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Total Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Contoh: 150000"
                    className="w-full p-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-red-500 bg-slate-50 focus:bg-white transition-all font-mono text-xl font-bold text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-95 text-lg flex items-center justify-center gap-2"
                >
                  <PlusCircle size={22} /> Simpan ke Laporan
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== POP-UP PIN RAHASIA ===== */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="bg-orange-500 p-6 flex flex-col items-center text-white relative">
              <button 
                onClick={() => setIsPinModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm text-orange-500">
                <Lock size={28} />
              </div>
              <h3 className="text-xl font-bold">Otorisasi Pemilik</h3>
              <p className="text-orange-100 text-sm mt-1 text-center">Masukkan PIN rahasia untuk mengakses data dapur dan finansial.</p>
            </div>

            <div className="p-8">
              <form onSubmit={submitPin}>
                <div className="mb-6">
                  <input
                    type="password" 
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value)
                      setPinError(false)
                    }}
                    placeholder="••••••"
                    className={`w-full text-center tracking-[0.5em] text-3xl font-bold p-4 border-2 rounded-2xl outline-none transition-all ${
                      pinError 
                        ? 'border-red-400 bg-red-50 text-red-600 focus:border-red-500' 
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-500 focus:bg-white'
                    }`}
                  />
                  {pinError && (
                    <p className="text-red-500 text-sm font-semibold mt-3 text-center animate-bounce">
                      PIN Salah! Silakan coba lagi.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-200 active:scale-95 text-lg"
                >
                  Buka Brankas
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ===== POP-UP CETAK STRUK ===== */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:bg-white print:backdrop-blur-none">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #thermal-receipt, #thermal-receipt * { visibility: visible; }
              #thermal-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
          `}</style>
          
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white no-print">
              <div className="flex items-center gap-2"><Printer size={20} /> <h3 className="font-bold">Pratinjau Struk (58mm)</h3></div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-300 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-gray-200 no-print flex justify-center">
              <div id="thermal-receipt" className="bg-white p-4 w-[280px] shadow-sm font-mono text-sm text-black">
                <div className="text-center mb-4">
                  <h2 className="font-black text-xl mb-1">DIMSUM GEMBUL</h2>
                  <p className="text-[10px]">Jl. Nusantara, Blora</p>
                  <p className="text-[10px]">Cabang Utama</p>
                </div>
                <div className="border-t border-dashed border-black my-2"></div>
                <div className="text-[10px] mb-2">
                  <p>{new Date().toLocaleString('id-ID')}</p>
                  <p>Kasir: Dewa (Owner)</p>
                  <p>Order ID: {selectedReceipt.id.replace('TRX-', '')}</p>
                </div>
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="text-[11px] mb-2 font-semibold flex flex-col gap-1">
                  {selectedReceipt.items_summary.split(', ').map((item, idx) => (
                    <p key={idx}>{item}</p>
                  ))}
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                <div className="flex justify-between font-black text-[13px]">
                  <span>TOTAL</span>
                  <span>Rp {selectedReceipt.total_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span>METODE</span>
                  <span>{selectedReceipt.payment_method}</span>
                </div>
                
                <div className="border-t border-dashed border-black my-2 mt-4"></div>
                <div className="text-center text-[10px] mt-2 font-bold">
                  <p>TERIMA KASIH</p>
                  <p>Sampai Jumpa Kembali!</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200 no-print">
              <button 
                onClick={() => window.print()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer size={20} /> Simpan PDF / Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POP-UP TRANSAKSI SUKSES ===== */}
      {successModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-90 duration-300">
            <div className="bg-green-500 p-6 flex flex-col items-center text-white relative">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm text-green-500 animate-bounce">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Pembayaran Lunas!</h3>
            </div>
            
            <div className="p-8 text-center bg-white">
              <p className="text-sm text-gray-500 mb-1 font-medium">Nomor Resi / Order ID</p>
              <p className="font-mono font-bold text-slate-800 mb-6 text-lg">{successModal.id}</p>
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 shadow-inner">
                <p className="text-sm text-gray-500 mb-1 font-semibold">Uang Kembalian</p>
                <p className="text-4xl font-black text-green-600">Rp {successModal.change.toLocaleString('id-ID')}</p>
              </div>

              <button
                onClick={() => setSuccessModal(null)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
              >
                Tutup & Lanjut Kasir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PEMUTAR AUDIO TERSEMBUNYI ===== */}
      <audio 
        ref={audioRef} 
        src="https://actions.google.com/sounds/v1/foley/cash_register_purchase.ogg" 
      />
      {/* ===================================== */}
    </div>
  )
}
export default App