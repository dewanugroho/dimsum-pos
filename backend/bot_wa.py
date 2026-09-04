import os
import requests
import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Memerintahkan Python membaca file .env
load_dotenv() 

# Mengambil kunci dari .env, bukan ditulis telanjang
API_KEY = os.getenv("GEMINI_API_KEY")
KASIR_API_URL = "http://127.0.0.1:8000"

def cek_menu_dan_stok():
    try:
        response = requests.get(f"{KASIR_API_URL}/products/")
        if response.status_code == 200:
            products = response.json()
            if not products: return "Belum ada menu."
            hasil = "Katalog Menu:\n"
            for p in products:
                hasil += f"- ID: {p['id']} | Nama: {p['name']} | Harga: Rp{p['selling_price']} | Stok: {p['stock_quantity']}\n"
            return hasil
        return "Gagal terhubung ke kasir."
    except Exception as e: return "Mesin web kasir mati."

def buat_pesanan_qris(pesanan: list):
    try:
        payload = {"payment_method": "QRIS", "amount_paid": 0, "items": pesanan}
        response = requests.post(f"{KASIR_API_URL}/transactions/", json=payload)
        if response.status_code == 200:
            data = response.json()
            # (DIUBAH) Kini menangkap payment_url dari Snap
            return f"Pesanan BERHASIL! Resi: {data['id']}. Link Pembayaran: {data['payment_url']}"
        return f"Pesanan GAGAL: {response.text}"
    except Exception as e: return f"Error: {str(e)}"

gemini_tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(name="cek_menu_dan_stok", description="Mengecek stok menu.", parameters=types.Schema(type="OBJECT", properties={})),
            types.FunctionDeclaration(
                name="buat_pesanan_qris",
                description="Memasukkan pesanan ke kasir dan menghasilkan link pembayaran Midtrans Snap.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={"pesanan": types.Schema(type="ARRAY", items=types.Schema(type="OBJECT", properties={"product_id": types.Schema(type="INTEGER"), "quantity": types.Schema(type="INTEGER")}, required=["product_id", "quantity"]))},
                    required=["pesanan"]
                )
            )
        ]
    )
]

gemini = genai.Client(api_key=API_KEY)
chat = gemini.chats.create(
    model="gemini-2.5-flash",
    config=types.GenerateContentConfig(
        tools=gemini_tools,
        temperature=0.7,
        system_instruction=(
            "Kamu adalah Asisten Kasir Online WhatsApp Dimsum Gembul. Gunakan gaya bahasa yang ramah, hangat, gaul, dan solutif. "
            "ATURAN MUTLAK:\n"
            "1. Cek menu & stok sebelum melayani. Perhatikan ID produk.\n"
            "2. PENANGANAN STOK & PRE-ORDER (SANGAT PENTING): Jika pelanggan pesan melebihi stok untuk dimakan SEKARANG, tolak dengan halus. "
            "TAPI, jika pelanggan memesan dalam jumlah besar untuk BESOK, LUSA, atau ACARA MENDATANG, JANGAN DITOLAK. "
            "Jawab dengan ramah dan antusias. Contoh: 'Wih, boleh banget kak! Stok hari ini memang sisa [X], tapi kalau untuk besok/acara besar, "
            "kami bisa siapkan fresh sesuai porsi yang kakak mau! Kita catat pesanannya ya kak?'.\n"
            "3. Jika pelanggan deal, gunakan fungsi 'buat_pesanan_qris'.\n"
            "4. Saat membalas dengan link pembayaran, BERIKAN LINK TERSEBUT SECARA LANGSUNG SEBAGAI TEKS BIASA agar bisa diklik.\n"
            "5. JIKA PELANGGAN MINTA GAMBAR MENU: Gunakan format Markdown: ![Brosur Menu](https://raw.githubusercontent.com/dewanugroho/gambar-bot/main/menu_dimsum.jpg)\n"
            "6. FALLBACK (Di luar konteks): Jika pelanggan mengirim pesan tidak jelas, gambar, link random, atau membahas topik di luar dimsum, "
            "balas dengan candaan ramah dan arahkan kembali ke pemesanan. Contoh: 'Hehehe, maaf kak bot-nya cuma ngerti soal dimsum yang enak-enak nih. Ada yang mau dipesan hari ini?'"
        )
    )
)

app = FastAPI(title="WhatsApp Clone Dimsum Gembul")
class ChatRequest(BaseModel): message: str

@app.post("/api/chat")
def handle_chat(req: ChatRequest):
    response = chat.send_message(req.message)
    while response.function_calls:
        for function_call in response.function_calls:
            name = function_call.name
            if name == "cek_menu_dan_stok": hasil = cek_menu_dan_stok()
            elif name == "buat_pesanan_qris": hasil = buat_pesanan_qris(function_call.args.get("pesanan", []))
            response = chat.send_message([types.Part.from_function_response(name=name, response={"result": hasil})])
    return {"reply": response.text}

@app.get("/")
def serve_whatsapp_ui():
    html_content = """
    <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>WhatsApp - Dimsum Gembul</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>body{margin:0;font-family:sans-serif;background:#d1d7db;display:flex;justify-content:center;height:100vh;align-items:center}.wa-container{width:100%;max-width:450px;height:90vh;background:#efeae2;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 15px 25px rgba(0,0,0,0.2)}.wa-header{background:#008069;color:#fff;padding:15px;display:flex;align-items:center;gap:15px;font-weight:bold}.wa-header img{width:45px;height:45px;border-radius:50%}.wa-chat-area{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;background-image:url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');background-size:cover;background-color:rgba(255,255,255,0.7);background-blend-mode:multiply}.bubble{max-width:80%;padding:12px 16px;border-radius:12px;font-size:14.5px;line-height:1.5;word-wrap:break-word}.bot{background:#fff;align-self:flex-start;border-top-left-radius:0}.user{background:#d9fdd3;align-self:flex-end;border-top-right-radius:0}.wa-input-area{background:#f0f2f5;padding:15px;display:flex;gap:12px}.wa-input-area input{flex:1;padding:14px;border:none;border-radius:25px;outline:none}.wa-input-area button{background:#008069;color:#fff;border:none;width:45px;height:45px;border-radius:50%;cursor:pointer}.bubble a{color:#0275d8;font-weight:bold;text-decoration:underline;word-break:break-all;}.bubble img { max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; display: block; }</style></head>
    <body><div class="wa-container"><div class="wa-header"><img src="https://ui-avatars.com/api/?name=Dimsum+Gembul&background=ff9800&color=fff" alt="Avatar"><div>Bot Kasir Dimsum Gembul<br><small>Online</small></div></div><div class="wa-chat-area" id="chat"><div class="bubble bot">Halo kak! Ada yang bisa dibantu hari ini?</div></div><div class="wa-input-area"><input type="text" id="msg" placeholder="Ketik pesan..." onkeypress="if(event.key === 'Enter') send()"><button onclick="send()"><i class="fas fa-paper-plane"></i></button></div></div>
    <script>
    async function send() {
        const msgInput = document.getElementById('msg'); const msg = msgInput.value.trim(); if (!msg) return;
        const chat = document.getElementById('chat'); chat.innerHTML += `<div class="bubble user">${msg}</div>`; msgInput.value = ''; chat.scrollTop = chat.scrollHeight;
        const loadingId = 'load-' + Date.now(); chat.innerHTML += `<div class="bubble bot" id="${loadingId}"><i>Mengetik...</i></div>`; chat.scrollTop = chat.scrollHeight;
        try {
            const res = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: msg})});
            const data = await res.json(); document.getElementById(loadingId).remove();
            chat.innerHTML += `<div class="bubble bot">${marked.parse(data.reply)}</div>`; chat.scrollTop = chat.scrollHeight;
        } catch (err) { document.getElementById(loadingId).innerText = "Koneksi terputus."; }
    }
    </script></body></html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")