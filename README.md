# Dimsum Gembul POS

Sistem Point of Sale full-stack untuk operasional F&B, dengan dashboard pemilik, potong stok otomatis, pembayaran QRIS (Midtrans), dan asisten pemesanan WhatsApp berbasis Gemini.

Proyek ini dibangun sebagai studi kasus **Dimsum Gembul**: menjembatani transaksi kasir di toko dengan pemesanan online yang tercatat di database yang sama.

## Arsitektur

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  React POS UI   │────▶│  FastAPI Kasir API   │────▶│  SQLite + ORM   │
│  (Vite :5173)   │     │  (Uvicorn :8000)     │     │  products, trx, │
└─────────────────┘     └──────────▲───────────┘     │  recipes, stock │
                                   │                 └─────────────────┘
┌─────────────────┐     ┌──────────┴───────────┐
│  WhatsApp Clone │────▶│  Bot FastAPI :8001   │
│  (UI demo chat) │     │  Gemini function call│
└─────────────────┘     └──────────────────────┘
                                   │
                        Midtrans Snap (QRIS)
```

Alur utama:

1. **Kasir** memasukkan item ke keranjang, lalu menyelesaikan pembayaran tunai atau QRIS.
2. API mencatat transaksi beserta timestamp WIB (`Asia/Jakarta`).
3. Stok produk (dan bahan baku sesuai resep) dipotong saat transaksi **berhasil**: tunai langsung, QRIS saat webhook Midtrans berstatus `settlement`.
4. **Dashboard pemilik** dikunci JWT. PIN hanya dicek di backend.
5. **Bot WhatsApp** membaca menu real-time dan membuat tagihan QRIS lewat API kasir yang sama.

## Fitur utama

- Kasir cepat: keranjang, hitung kembalian, pratinjau struk thermal 58mm
- Pembayaran tunai dan QRIS (Midtrans Snap) dengan polling status
- Potong stok produk + bill of materials otomatis pada transaksi lunas
- Riwayat penjualan dengan waktu transaksi yang eksplisit
- Dashboard owner: omzet, HPP, laba, tren 30 hari, gudang, CRUD menu
- Bot Gemini dengan function calling: cek stok dan buat pesanan QRIS
- Kredensial sensitif hanya lewat variabel lingkungan

## Tech stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, Axios, Recharts, Lucide |
| Backend kasir | FastAPI, SQLAlchemy, SQLite, PyJWT |
| Pembayaran | Midtrans Snap API |
| Bot | FastAPI, Google GenAI (Gemini 2.5 Flash) |
| Konfigurasi | python-dotenv, Vite env (`VITE_API_BASE_URL`) |

## Struktur repositori

```
dimsum-pos/
├── backend/
│   ├── main.py            # API kasir, laporan, gudang
│   ├── bot_wa.py          # asisten chat + UI demo
│   ├── models.py          # skema database
│   ├── schemas.py         # kontrak Pydantic
│   ├── database.py        # engine SQLite
│   ├── seed.py            # data menu & gudang awal
│   └── .env.example
├── frontend/
│   ├── src/App.jsx        # UI kasir & dashboard
│   └── .env.example
├── .env.example
└── README.md
```

## Menjalankan dari nol

### Prasyarat

- Python 3.10+
- Node.js 18+
- Akun Midtrans (opsional, hanya untuk QRIS)
- API key Google Gemini (opsional, hanya untuk bot)

### 1. Clone dan siapkan kredensial

```bash
git clone https://github.com/dewanugroho/dimsum-pos.git
cd dimsum-pos

copy .env.example backend\.env      # Windows
copy frontend\.env.example frontend\.env
```

Isi `backend/.env` minimal:

```env
SECRET_KEY=ganti_dengan_string_rahasia_yang_panjang
OWNER_PIN=123456
JWT_EXPIRE_HOURS=12
MIDTRANS_SERVER_KEY=
MIDTRANS_IS_PRODUCTION=false
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
GEMINI_API_KEY=
KASIR_API_URL=http://127.0.0.1:8000
```

Isi `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Jangan commit file `.env`.

### 2. Backend kasir

```bash
cd backend
python -m venv env
env\Scripts\activate          # macOS/Linux: source env/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload --port 8000
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend kasir

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Buka [http://127.0.0.1:5173](http://127.0.0.1:5173). Masukkan PIN yang sama dengan `OWNER_PIN` untuk membuka dashboard.

### 4. Bot WhatsApp (opsional)

Pastikan API kasir sudah berjalan di port 8000, lalu:

```bash
cd backend
env\Scripts\activate
python bot_wa.py
```

Buka [http://127.0.0.1:8001](http://127.0.0.1:8001).

## Catatan operasional

- Timestamp transaksi disimpan dalam zona waktu **WIB** (`YYYY-MM-DD HH:MM:SS`).
- Pembayaran tunai langsung berstatus `Success` dan memotong stok.
- Pembayaran QRIS berstatus `Pending` sampai webhook `/webhook/` menerima `settlement`, baru kemudian stok dipotong.
- Endpoint analitik harian hanya menghitung transaksi `Success`.
- Jika `MIDTRANS_SERVER_KEY` kosong, kasir tetap bisa dipakai untuk pembayaran tunai.
- Jika `GEMINI_API_KEY` kosong, UI bot tetap tampil tetapi chat mengembalikan HTTP 503.

## Keamanan

- PIN owner, JWT secret, kunci Midtrans, dan API key Gemini tidak di-hardcode.
- Token dashboard memiliki masa berlaku (`JWT_EXPIRE_HOURS`).
- CORS dapat dibatasi lewat `CORS_ORIGINS`.

## Lisensi

Proyek portofolio / studi kasus. Sesuaikan lisensi jika Anda memublikasikan ulang.
