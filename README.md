# Dimsum Gembul - Smart POS & AI WhatsApp Assistant

Sistem *Point of Sale* (POS) *Full-Stack* dan Asisten Chatbot cerdas yang dirancang untuk mengotomatisasi operasional operasional bisnis F&B (Studi Kasus: Dimsum Gembul). Proyek ini menjembatani transaksi kasir fisik dengan pemesanan *online* otomatis menggunakan AI NLP (*Natural Language Processing*) mutakhir.

## Fitur Utama

**1. Smart WhatsApp Bot (Gemini 2.5 Flash)**
* **Function Calling:** Bot tidak hanya membalas *chat*, tapi mampu memanggil fungsi *backend* untuk mengecek stok (*Real-time*) dan membuat tagihan pembayaran secara mandiri.
* **Smart Pre-Order Logic:** Diprogram (*Prompt Engineering*) untuk menolak pesanan instan jika stok habis, namun otomatis melakukan negosiasi jika pelanggan memesan untuk *Pre-Order* (acara mendatang).
* **Midtrans Integration:** Mengirimkan *link* pembayaran QRIS dinamis langsung ke layar *chat* WhatsApp pelanggan.

**2. Point of Sale (POS) - Mode Kasir**
* **UI Responsif & Cepat:** Keranjang belanja *real-time*, perhitungan kembalian otomatis, dan animasi transisi pembayaran sukses.
* **Thermal Receipt Preview:** Fitur cetak pratinjau struk bergaya kertas thermal 58mm untuk printer kasir *bluetooth*.
* **Pencatat Pengeluaran (Expense Tracker):** Formulir cepat untuk kasir mencatat pengeluaran operasional harian (bahan baku).

**3. Owner Dashboard (Enterprise Grade Security)**
* **JWT Authentication:** Dasbor analitik dikunci menggunakan *JSON Web Token* di sisi *backend*, memastikan keamanan data finansial.
* **Real-time Analytics:** Visualisasi pergerakan omzet mingguan menggunakan **Recharts**.
* **Manajemen Gudang:** Pemantauan dan pembaruan stok bahan baku yang terpotong otomatis setiap kali ada transaksi.

## 🛠️ Tech Stack

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | React.js, Vite | Antarmuka kasir yang cepat dan reaktif. |
| **Styling** | Tailwind CSS, Lucide React | Desain UI modern, *clean*, dan profesional. |
| **Backend** | FastAPI, Python | API berkinerja tinggi untuk memproses transaksi. |
| **Database** | SQLAlchemy, SQLite | *Object-Relational Mapping* untuk manajemen data. |
| **AI / NLP** | Google GenAI (Gemini) | Eksekusi *chatbot* dengan fitur *Function Calling*. |
| **Keamanan** | PyJWT, python-dotenv | Standar keamanan token industri & proteksi rahasia. |
| **Payment** | Midtrans (Snap API) | Gerbang pembayaran *cashless* (QRIS). |

## ⚙️ Cara Instalasi (Local Development)

### 1. Persiapan Backend (FastAPI & Bot)
```bash
# Clone repositori
git clone [https://github.com/username-anda/dimsum-pos.git](https://github.com/username-anda/dimsum-pos.git)
cd dimsum-pos/backend

# Buat virtual environment & install dependensi
python -m venv env
source env/bin/activate  # Untuk Windows: env\Scripts\activate
pip install -r requirements.txt

# Buat file .env dan isi dengan kredensial Anda
echo "SECRET_KEY=rahasia_jwt_anda" >> .env
echo "MIDTRANS_SERVER_KEY=server_key_midtrans_anda" >> .env
echo "GEMINI_API_KEY=api_key_gemini_anda" >> .env

# Jalankan Server Kasir (Port 8000)
uvicorn main:app --reload

# Jalankan Server Bot WhatsApp (Port 8001)
python bot_wa.py

# Buka terminal baru, masuk ke folder frontend
cd ../frontend

# Install dependensi
npm install

# Jalankan server frontend
npm run dev