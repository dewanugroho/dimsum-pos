import logging
import os
import time
from pathlib import Path

import requests
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dimsum-bot")

API_KEY      = os.getenv("GEMINI_API_KEY")
KASIR_API_URL = os.getenv("KASIR_API_URL", "http://127.0.0.1:8000").rstrip("/")
BOT_HOST     = os.getenv("BOT_HOST", "127.0.0.1")
BOT_PORT     = int(os.getenv("BOT_PORT", "8001"))

# Sesi per user dihapus otomatis setelah IDLE ini (detik)
SESSION_TTL_SECONDS = 30 * 60  # 30 menit

# ── Sesi Gemini per pengguna ─────────────────────────────────────────────────
# Struktur: { user_id: {"chat": Chat, "last_active": float} }
_user_sessions: dict[str, dict] = {}

gemini_client: genai.Client | None = None


# ── Helper format harga ───────────────────────────────────────────────────────
def fmt_rupiah(value) -> str:
    """Format angka ke Rp 17.000 (standar Indonesia)."""
    try:
        return f"Rp {int(float(value)):,}".replace(",", ".")
    except (TypeError, ValueError):
        return str(value)


# ── Fungsi tool: cek menu & stok ─────────────────────────────────────────────
def cek_menu_dan_stok() -> str:
    try:
        response = requests.get(f"{KASIR_API_URL}/products/", timeout=10)
        response.raise_for_status()
        products = response.json()
        if not products:
            return "Belum ada menu yang tersedia saat ini."

        baris = []
        for p in products:
            if not p.get("is_active", True):
                continue
            nama  = p.get("name", "?")
            harga = fmt_rupiah(p.get("selling_price", 0))
            stok  = p.get("stock_quantity", 0)
            pid   = p.get("id")
            status = "✅ Tersedia" if stok > 0 else "❌ Habis"
            baris.append(f"• [ID:{pid}] {nama} — {harga} | {status}")

        return "Berikut menu Dimsum Gembul hari ini:\n" + "\n".join(baris)
    except requests.RequestException:
        logger.exception("Gagal mengambil menu dari API kasir")
        # Kembalikan pesan ramah, detail error TIDAK bocor ke pelanggan
        return "Maaf, menu sedang tidak dapat ditampilkan. Silakan coba lagi sebentar."
    except Exception:
        logger.exception("Kesalahan tak terduga saat cek menu")
        return "Maaf, terjadi kendala saat memuat menu."


# ── Fungsi tool: buat pesanan QRIS ───────────────────────────────────────────
def buat_pesanan_qris(pesanan: list) -> str:
    try:
        if not pesanan:
            return "Pesanan belum lengkap. Sebutkan menu dan jumlahnya ya."

        payload = {
            "payment_method": "QRIS",
            "amount_paid": 0,
            "items": pesanan,
        }
        response = requests.post(
            f"{KASIR_API_URL}/transactions/",
            json=payload,
            timeout=20,
        )

        if response.status_code == 200:
            data          = response.json()
            order_id      = data.get("id", "-")
            created_at    = data.get("created_at", "-")
            payment_url   = data.get("payment_url", "")
            total         = fmt_rupiah(data.get("total_amount", 0))

            url_display = payment_url if payment_url else "(link tidak tersedia)"
            return (
                f"Pesanan berhasil dicatat!\n"
                f"No. Pesanan : {order_id}\n"
                f"Waktu       : {created_at}\n"
                f"Total       : {total}\n"
                f"Link Bayar  : {url_display}"
            )

        # Ambil pesan error dari backend tapi jangan bocorkan stack-trace
        try:
            detail = response.json().get("detail", "Terjadi kesalahan pada server.")
        except Exception:
            detail = "Terjadi kesalahan pada server."
        logger.warning("Buat pesanan gagal HTTP %s: %s", response.status_code, detail)
        return f"Maaf, pesanan gagal diproses: {detail}"

    except requests.RequestException:
        logger.exception("Gagal menghubungi API kasir saat buat pesanan")
        return "Maaf, koneksi ke kasir terputus. Silakan coba lagi."
    except Exception:
        logger.exception("Kesalahan tak terduga saat buat pesanan")
        return "Maaf, terjadi kendala saat memproses pesanan."


# ── Tools Gemini ─────────────────────────────────────────────────────────────
GEMINI_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="cek_menu_dan_stok",
                description="Mengambil daftar menu dan stok Dimsum Gembul yang tersedia hari ini.",
                parameters=types.Schema(type="OBJECT", properties={}),
            ),
            types.FunctionDeclaration(
                name="buat_pesanan_qris",
                description=(
                    "Mencatat pesanan ke kasir dan menghasilkan link pembayaran QRIS Midtrans. "
                    "Panggil HANYA setelah pelanggan mengonfirmasi ringkasan pesanan dan total harga."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "pesanan": types.Schema(
                            type="ARRAY",
                            items=types.Schema(
                                type="OBJECT",
                                properties={
                                    "product_id": types.Schema(type="INTEGER"),
                                    "quantity":   types.Schema(type="INTEGER"),
                                },
                                required=["product_id", "quantity"],
                            ),
                        )
                    },
                    required=["pesanan"],
                ),
            ),
        ]
    )
]

SYSTEM_INSTRUCTION = """
Kamu adalah Asisten Kasir Online WhatsApp Dimsum Gembul — sebuah usaha dimsum homemade \
yang mengutamakan cita rasa autentik dan pelayanan yang hangat. \
Gaya bahasamu: ramah, hangat, sedikit gaul, dan solutif. Selalu buat pelanggan merasa dihargai.

ATURAN WAJIB:
1. Selalu cek menu & stok dulu sebelum melayani pesanan.
2. Format harga SELALU menggunakan format Rp 17.000 (bukan Rp17000 atau 17000).
3. SEBELUM memanggil buat_pesanan_qris, WAJIB tampilkan ringkasan pesanan dan total harga, \
   lalu TUNGGU konfirmasi eksplisit dari pelanggan ("ya", "ok", "setuju", dll.).
4. Saat membalas dengan link pembayaran, kirimkan link-nya sebagai teks biasa agar bisa diklik.
5. PENANGANAN STOK & PRE-ORDER: Jika pelanggan memesan melebihi stok untuk dimakan SEKARANG, \
   tolak dengan halus. TAPI jika pesanan untuk besok, lusa, atau acara mendatang, JANGAN DITOLAK — \
   sambut dengan antusias: "Wah, boleh banget Kak! Stok hari ini memang sisa [X], tapi kalau \
   untuk besok/acara, kami bisa siapkan fresh sesuai porsi. Kita catat dulu ya?"
6. GAMBAR MENU: Jika pelanggan minta lihat menu/brosur, gunakan format Markdown: \
   ![Brosur Menu](https://raw.githubusercontent.com/dewanugroho/gambar-bot/main/menu_dimsum.jpg)
7. FALLBACK: Jika pesan tidak relevan (topik di luar dimsum, gambar random, dll.), balas \
   dengan santai dan arahkan kembali: \
   "Hehe, maaf Kak — bot ini hanya paham soal dimsum yang enak. Ada yang mau dipesan hari ini? 😄"
8. JANGAN PERNAH menampilkan pesan error teknis, stack trace, atau detail internal ke pelanggan.
""".strip()


# ── Manajemen sesi per pengguna ───────────────────────────────────────────────
def _get_or_create_session(user_id: str) -> types.Chat | None:
    """
    Mengembalikan sesi chat Gemini milik user_id.
    Sesi dibuat baru jika belum ada atau sudah kedaluwarsa (TTL).
    Return None jika Gemini belum dikonfigurasi.
    """
    if gemini_client is None:
        return None

    now = time.time()
    entry = _user_sessions.get(user_id)

    # Hapus sesi yang sudah expired
    if entry and (now - entry["last_active"]) > SESSION_TTL_SECONDS:
        logger.info("Sesi user %s kedaluwarsa — membuat sesi baru.", user_id)
        del _user_sessions[user_id]
        entry = None

    if entry is None:
        chat = gemini_client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                tools=GEMINI_TOOLS,
                temperature=0.3,          # lebih konsisten, tidak asal buat harga/stok
                system_instruction=SYSTEM_INSTRUCTION,
            ),
        )
        _user_sessions[user_id] = {"chat": chat, "last_active": now}
        logger.info("Sesi baru dibuat untuk user: %s", user_id)
        return chat

    # Perbarui last_active
    _user_sessions[user_id]["last_active"] = now
    return _user_sessions[user_id]["chat"]


def _cleanup_expired_sessions() -> None:
    """Hapus sesi yang sudah expired dari memori (dipanggil di setiap request)."""
    now  = time.time()
    dead = [uid for uid, s in _user_sessions.items()
            if (now - s["last_active"]) > SESSION_TTL_SECONDS]
    for uid in dead:
        del _user_sessions[uid]
        logger.debug("Sesi expired dihapus: %s", uid)


# ── Inisialisasi Gemini ───────────────────────────────────────────────────────
def init_gemini() -> None:
    global gemini_client
    if not API_KEY:
        logger.warning("GEMINI_API_KEY belum diatur. Endpoint chat tidak akan berfungsi.")
        return
    try:
        gemini_client = genai.Client(api_key=API_KEY)
        logger.info("Gemini client berhasil diinisialisasi.")
    except Exception:
        logger.exception("Gagal menginisialisasi Gemini client")
        gemini_client = None


init_gemini()

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="WhatsApp Clone Dimsum Gembul")


class ChatRequest(BaseModel):
    message: str
    user_id: str = "default"   # identitas pengirim; diisi nomor WA di integrasi nyata


FALLBACK_REPLY = "Maaf kak, ada gangguan sebentar. Bisa ulangi pesanannya ya? 🙏"


@app.post("/api/chat")
def handle_chat(req: ChatRequest):
    try:
        if not req.message or not req.message.strip():
            raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong.")

        # Bersihkan sesi expired di setiap request (lightweight)
        _cleanup_expired_sessions()

        chat = _get_or_create_session(req.user_id)
        if chat is None:
            raise HTTPException(
                status_code=503,
                detail="Bot belum dikonfigurasi. Isi GEMINI_API_KEY di file .env.",
            )

        response = chat.send_message(req.message)

        # Jalankan function calls dalam loop sampai tidak ada lagi
        while response.function_calls:
            parts = []
            for fc in response.function_calls:
                name = fc.name
                if name == "cek_menu_dan_stok":
                    result = cek_menu_dan_stok()
                elif name == "buat_pesanan_qris":
                    result = buat_pesanan_qris(fc.args.get("pesanan", []))
                else:
                    result = f"Fungsi '{name}' tidak dikenali."
                    logger.warning("Gemini memanggil fungsi tidak dikenal: %s", name)
                parts.append(
                    types.Part.from_function_response(name=name, response={"result": result})
                )
            response = chat.send_message(parts)

        reply = (response.text or "").strip() or FALLBACK_REPLY
        return {"reply": reply}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal memproses chat untuk user %s", req.user_id)
        # JANGAN bocorkan detail exception ke pelanggan
        raise HTTPException(status_code=500, detail="Gagal memproses pesan.")


# ── UI WhatsApp Clone ─────────────────────────────────────────────────────────
@app.get("/")
def serve_whatsapp_ui():
    html_content = """
    <!DOCTYPE html><html lang="id"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp - Dimsum Gembul</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
      body{margin:0;font-family:sans-serif;background:#d1d7db;display:flex;justify-content:center;height:100vh;align-items:center}
      .wa-container{width:100%;max-width:450px;height:90vh;background:#efeae2;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 15px 25px rgba(0,0,0,.2)}
      .wa-header{background:#008069;color:#fff;padding:15px;display:flex;align-items:center;gap:15px;font-weight:bold}
      .wa-header img{width:45px;height:45px;border-radius:50%}
      .wa-chat-area{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;background-image:url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');background-size:cover;background-color:rgba(255,255,255,.7);background-blend-mode:multiply}
      .bubble{max-width:80%;padding:12px 16px;border-radius:12px;font-size:14.5px;line-height:1.5;word-wrap:break-word}
      .bot{background:#fff;align-self:flex-start;border-top-left-radius:0}
      .user{background:#d9fdd3;align-self:flex-end;border-top-right-radius:0}
      .wa-input-area{background:#f0f2f5;padding:15px;display:flex;gap:12px}
      .wa-input-area input{flex:1;padding:14px;border:none;border-radius:25px;outline:none}
      .wa-input-area button{background:#008069;color:#fff;border:none;width:45px;height:45px;border-radius:50%;cursor:pointer}
      .bubble a{color:#0275d8;font-weight:bold;text-decoration:underline;word-break:break-all}
      .bubble img{max-width:100%;height:auto;border-radius:8px;margin-top:8px;display:block}
    </style></head>
    <body>
    <div class="wa-container">
      <div class="wa-header">
        <img src="https://ui-avatars.com/api/?name=Dimsum+Gembul&background=ff9800&color=fff" alt="Avatar">
        <div>Bot Kasir Dimsum Gembul<br><small>Online</small></div>
      </div>
      <div class="wa-chat-area" id="chat">
        <div class="bubble bot">
          Halo Kak! 👋 Selamat datang di <strong>Dimsum Gembul</strong>! 🥟<br>
          Mau pesan dimsum enak hari ini? Ketik <em>"menu"</em> untuk lihat pilihan,
          atau langsung sebutkan pesanannya ya!
        </div>
      </div>
      <div class="wa-input-area">
        <input type="text" id="msg" placeholder="Ketik pesan..." onkeypress="if(event.key==='Enter')send()">
        <button onclick="send()"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
    <script>
    // User ID sederhana per tab browser (simulasi nomor WA unik)
    const USER_ID = 'web-' + Math.random().toString(36).slice(2, 9);

    async function send() {
      const input = document.getElementById('msg');
      const msg   = input.value.trim();
      if (!msg) return;

      const chat = document.getElementById('chat');
      chat.innerHTML += `<div class="bubble user">${msg}</div>`;
      input.value = '';
      chat.scrollTop = chat.scrollHeight;

      const loadId = 'load-' + Date.now();
      chat.innerHTML += `<div class="bubble bot" id="${loadId}"><em>Mengetik...</em></div>`;
      chat.scrollTop = chat.scrollHeight;

      try {
        const res  = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ message: msg, user_id: USER_ID }),
        });
        const data = await res.json();
        document.getElementById(loadId).remove();
        const reply = data.reply || data.detail || 'Maaf, bot sedang bermasalah.';
        chat.innerHTML += `<div class="bubble bot">${marked.parse(reply)}</div>`;
      } catch {
        document.getElementById(loadId).innerText = 'Koneksi terputus. Coba lagi ya.';
      }
      chat.scrollTop = chat.scrollHeight;
    }
    </script>
    </body></html>
    """
    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    uvicorn.run(app, host=BOT_HOST, port=BOT_PORT, log_level="warning")
