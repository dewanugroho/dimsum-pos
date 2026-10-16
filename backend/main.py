import hashlib
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

import jwt
import midtransclient
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, update
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dimsum-pos")

WIB = ZoneInfo("Asia/Jakarta")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dimsum Gembul POS API",
    description="API kasir, gudang, dan analitik untuk Dimsum Gembul.",
    version="1.0.0",
)

cors_origins_raw = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = ["*"] if cors_origins_raw == "*" else [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY")
OWNER_PIN = os.getenv("OWNER_PIN")
ALGORITHM = "HS256"
try:
    JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "12"))
except ValueError:
    JWT_EXPIRE_HOURS = 12
MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower() == "true"

snap_api = None
if MIDTRANS_SERVER_KEY:
    snap_api = midtransclient.Snap(
        is_production=MIDTRANS_IS_PRODUCTION,
        server_key=MIDTRANS_SERVER_KEY,
    )

# ── Password hashing (bcrypt) ─────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


class PinRequest(BaseModel):
    pin: str


class StockUpdate(BaseModel):
    new_stock: float


def now_wib() -> datetime:
    return datetime.now(WIB).replace(tzinfo=None)


def format_timestamp(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.strftime("%Y-%m-%d %H:%M:%S")


def require_secret_key() -> str:
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="SECRET_KEY belum dikonfigurasi di file .env.")
    return SECRET_KEY


def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Akses ditolak. Token hilang.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, require_secret_key(), algorithms=[ALGORITHM])
        # Token lama (PIN) hanya punya sub="owner", tidak ada field role.
        # Normalisasi: pastikan payload selalu punya "role" agar endpoint bisa cek.
        if "role" not in payload:
            payload["role"] = payload.get("sub", "owner")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi habis. Silakan login kembali.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal memverifikasi token JWT")
        raise HTTPException(status_code=401, detail="Gagal memverifikasi token.")


def require_roles(*allowed: str):
    """
    Dependency factory — memastikan token valid DAN role pengguna
    termasuk dalam `allowed`.

    Contoh pemakaian:
        Depends(require_roles("owner"))
        Depends(require_roles("owner", "kasir"))

    Return: payload JWT (dict) — bisa dipakai endpoint jika perlu akses username/role.
    """
    def _check(payload: dict = Depends(verify_token)) -> dict:
        if payload.get("role") not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak. Dibutuhkan role: {', '.join(allowed)}.",
            )
        return payload
    return _check


def generate_receipt_id(created_at: datetime) -> str:
    suffix = uuid.uuid4().hex[:4].upper()
    return f"TRX-{created_at.strftime('%Y%m%d%H%M%S')}-{suffix}"


def apply_stock_deduction(db: Session, product: models.Product, quantity: int) -> None:
    current_stock = product.stock_quantity or 0
    product.stock_quantity = current_stock - quantity

    recipe_items = db.query(models.RecipeItem).filter(models.RecipeItem.product_id == product.id).all()
    for recipe in recipe_items:
        material = db.query(models.RawMaterial).filter(models.RawMaterial.id == recipe.raw_material_id).first()
        if material:
            material.stock_quantity = (material.stock_quantity or 0) - (recipe.quantity_needed * quantity)


def deduct_items_stock(db: Session, transaction_id: str) -> None:
    items = db.query(models.TransactionItem).filter(models.TransactionItem.transaction_id == transaction_id).all()
    for item in items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            logger.warning("Produk %s tidak ditemukan saat potong stok transaksi %s", item.product_id, transaction_id)
            continue
        apply_stock_deduction(db, product, item.quantity)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    if isinstance(exc, RequestValidationError):
        return await request_validation_exception_handler(request, exc)
    logger.exception("Kesalahan tidak tertangani pada %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan internal pada server."})


@app.get("/")
def read_root():
    return {"message": "Selamat datang di API Kasir Dimsum Gembul!"}


@app.post("/verify-pin")
def verify_pin(req: PinRequest):
    try:
        if not OWNER_PIN:
            raise HTTPException(status_code=500, detail="OWNER_PIN belum dikonfigurasi di file .env.")
        if req.pin != OWNER_PIN:
            raise HTTPException(status_code=401, detail="PIN salah")

        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
        token = jwt.encode({"sub": "owner", "exp": expire}, require_secret_key(), algorithm=ALGORITHM)
        return {"access_token": token}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal memverifikasi PIN")
        raise HTTPException(status_code=500, detail="Gagal memproses autentikasi PIN.")


# ── RBAC: Login berbasis akun ─────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.TokenResponse, tags=["Auth"])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Login dengan username + password.
    Mengembalikan JWT yang mengandung sub (username), role, dan user_id.
    """
    try:
        user = db.query(models.User).filter(
            models.User.username == payload.username.strip().lower()
        ).first()

        if not user or not verify_password(payload.password, user.password_hash):
            # Gunakan pesan yang sama untuk keduanya agar tidak bocorkan info user mana yang ada
            raise HTTPException(status_code=401, detail="Username atau password salah.")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Akun ini dinonaktifkan. Hubungi owner.")

        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
        token = jwt.encode(
            {
                "sub": user.username,
                "role": user.role,
                "user_id": user.id,
                "exp": expire,
            },
            require_secret_key(),
            algorithm=ALGORITHM,
        )
        return schemas.TokenResponse(
            access_token=token,
            token_type="bearer",
            role=user.role,
            username=user.username,
            full_name=user.full_name,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal memproses login")
        raise HTTPException(status_code=500, detail="Gagal memproses login.")


@app.get("/auth/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_current_user(user_payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """
    Mengembalikan data akun yang sedang login berdasarkan JWT.
    Berguna untuk frontend memeriksa sesi yang masih aktif.
    """
    try:
        username = user_payload.get("sub")
        # Token lama (dari /verify-pin) memiliki sub="owner" tapi tidak ada
        # field "user_id" dalam payload-nya. Bedakan dengan akun RBAC yang punya user_id.
        is_legacy_pin_token = not user_payload.get("user_id")
        if not username or is_legacy_pin_token:
            raise HTTPException(status_code=404, detail="Endpoint ini hanya untuk login berbasis akun.")

        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="Akun tidak ditemukan.")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Akun ini dinonaktifkan.")
        return user
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal mengambil data pengguna saat ini")
        raise HTTPException(status_code=500, detail="Gagal memuat data akun.")


@app.get("/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return db.query(models.Product).offset(skip).limit(limit).all()
    except Exception:
        logger.exception("Gagal mengambil daftar produk")
        raise HTTPException(status_code=500, detail="Gagal memuat data produk.")


@app.post("/transactions/")
def create_transaction(transaction_data: schemas.TransactionCreate, db: Session = Depends(get_db)):
    try:
        payment_method = (transaction_data.payment_method or "").upper().strip()
        if payment_method not in {"CASH", "QRIS"}:
            raise HTTPException(status_code=400, detail="Metode pembayaran harus CASH atau QRIS.")
        if not transaction_data.items:
            raise HTTPException(status_code=400, detail="Transaksi harus memiliki minimal satu item.")

        created_at = now_wib()
        receipt_id = generate_receipt_id(created_at)
        total_amount = 0
        resolved_items = []

        for item in transaction_data.items:
            if item.quantity < 1:
                raise HTTPException(status_code=400, detail="Kuantitas item harus lebih dari 0.")

            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produk ID {item.product_id} tidak ditemukan.")
            if product.selling_price is None:
                raise HTTPException(status_code=400, detail=f"Harga jual produk '{product.name}' belum diatur.")

            total_amount += product.selling_price * item.quantity
            resolved_items.append((product, item.quantity))

        if total_amount <= 0:
            raise HTTPException(status_code=400, detail="Total transaksi tidak valid.")

        initial_status = "Success" if payment_method == "CASH" else "Pending"
        new_transaction = models.Transaction(
            id=receipt_id,
            user_id=1,
            payment_method=payment_method,
            total_amount=total_amount,
            status=initial_status,
            created_at=created_at,
        )
        db.add(new_transaction)

        for product, quantity in resolved_items:
            db.add(
                models.TransactionItem(
                    transaction_id=receipt_id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.selling_price,
                    hpp_at_sale=product.base_hpp or 0,
                    subtotal=product.selling_price * quantity,
                )
            )
            if payment_method == "CASH":
                apply_stock_deduction(db, product, quantity)

        payment_url = None
        if payment_method == "QRIS":
            if not snap_api:
                db.rollback()
                raise HTTPException(status_code=503, detail="Pembayaran QRIS belum dikonfigurasi (MIDTRANS_SERVER_KEY).")
            param = {
                "transaction_details": {"order_id": receipt_id, "gross_amount": int(total_amount)},
                "customer_details": {"first_name": "Pelanggan", "last_name": "Dimsum Gembul"},
            }
            try:
                snap_response = snap_api.create_transaction(param)
                payment_url = snap_response.get("redirect_url")
            except Exception as exc:
                db.rollback()
                logger.exception("Gagal membuat transaksi Midtrans")
                raise HTTPException(status_code=502, detail=f"Gagal koneksi Midtrans: {exc}") from exc

        db.commit()
        db.refresh(new_transaction)

        return {
            "id": new_transaction.id,
            "payment_method": new_transaction.payment_method,
            "status": new_transaction.status,
            "total_amount": new_transaction.total_amount,
            "created_at": format_timestamp(new_transaction.created_at),
            "payment_url": payment_url,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal membuat transaksi")
        raise HTTPException(status_code=500, detail="Gagal mencatat transaksi.")


@app.post("/webhook/")
async def midtrans_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Menerima notifikasi pembayaran dari Midtrans.

    Keamanan:
    1. Verifikasi signature_key agar tidak bisa dipalsukan oleh pihak luar.
    2. UPDATE atomik (WHERE status='Pending') untuk mencegah race condition
       jika Midtrans mengirim notifikasi duplikat secara bersamaan.
    """
    try:
        payload = await request.json()
    except Exception:
        logger.warning("Webhook menerima payload yang tidak valid (bukan JSON).")
        return {"status": "ignored", "reason": "payload tidak valid"}

    try:
        order_id          = payload.get("order_id", "")
        transaction_status = payload.get("transaction_status", "")
        status_code       = payload.get("status_code", "")
        gross_amount      = payload.get("gross_amount", "")
        received_sig      = payload.get("signature_key", "")

        if not order_id:
            return {"status": "ignored", "reason": "order_id kosong"}

        # ── 1. Verifikasi signature Midtrans ─────────────────────────────
        # Formula resmi: SHA512(order_id + status_code + gross_amount + server_key)
        if MIDTRANS_SERVER_KEY:
            raw = f"{order_id}{status_code}{gross_amount}{MIDTRANS_SERVER_KEY}"
            expected_sig = hashlib.sha512(raw.encode()).hexdigest()
            if received_sig != expected_sig:
                logger.warning(
                    "Webhook ditolak: signature tidak valid untuk order %s", order_id
                )
                raise HTTPException(status_code=403, detail="Signature tidak valid.")
        else:
            # Jika MIDTRANS_SERVER_KEY belum diset (mode dev/sandbox tanpa key),
            # log peringatan tapi tetap proses agar tidak memblokir pengembangan lokal.
            logger.warning(
                "MIDTRANS_SERVER_KEY belum diset — verifikasi signature dilewati (mode dev)."
            )

        # ── 2. Hanya proses status "settlement" ─────────────────────────
        if transaction_status != "settlement":
            logger.info(
                "Webhook order %s diabaikan — status: %s", order_id, transaction_status
            )
            return {"status": "ignored", "reason": f"status '{transaction_status}' tidak diproses"}

        # ── 3. UPDATE atomik: hanya berhasil jika status masih "Pending" ─
        # Ini mencegah race condition jika webhook duplikat tiba bersamaan.
        result = db.execute(
            update(models.Transaction)
            .where(models.Transaction.id == order_id)
            .where(models.Transaction.status == "Pending")
            .values(status="Success")
            .returning(models.Transaction.id)  # type: ignore[attr-defined]
        )
        matched_id = result.scalar()

        if not matched_id:
            # Bisa berarti: transaksi tidak ditemukan, atau sudah diproses sebelumnya
            existing = db.query(models.Transaction.status).filter(
                models.Transaction.id == order_id
            ).scalar()
            if existing is None:
                logger.warning("Webhook untuk order tidak dikenal: %s", order_id)
            else:
                logger.info(
                    "Webhook order %s diabaikan — status saat ini: %s (bukan Pending)",
                    order_id, existing,
                )
            db.rollback()
            return {"status": "ignored", "reason": "tidak ada perubahan status"}

        # ── 4. Potong stok setelah UPDATE berhasil ───────────────────────
        deduct_items_stock(db, order_id)
        db.commit()
        logger.info(
            "Transaksi %s dilunasi via QRIS pada %s",
            order_id, format_timestamp(now_wib()),
        )
        return {"status": "ok"}

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal memproses webhook Midtrans")
        raise HTTPException(status_code=500, detail="Gagal memproses notifikasi pembayaran.")


@app.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    try:
        transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan.")
        return {
            "id": transaction.id,
            "status": transaction.status,
            "payment_method": transaction.payment_method,
            "total_amount": transaction.total_amount,
            "created_at": format_timestamp(transaction.created_at),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal mengambil transaksi %s", transaction_id)
        raise HTTPException(status_code=500, detail="Gagal memuat data transaksi.")


@app.get("/history/")
def get_transaction_history(user: dict = Depends(require_roles("kasir", "owner")), db: Session = Depends(get_db)):
    try:
        transactions = db.query(models.Transaction).order_by(models.Transaction.created_at.desc(), models.Transaction.id.desc()).all()
        history_data = []

        for transaction in transactions:
            items = db.query(models.TransactionItem).filter(models.TransactionItem.transaction_id == transaction.id).all()
            item_names = []
            for item in items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
                label = product.name if product else f"Produk #{item.product_id}"
                item_names.append(f"{label} ({item.quantity}x)")

            history_data.append({
                "id": transaction.id,
                "total_amount": transaction.total_amount,
                "payment_method": transaction.payment_method,
                "status": transaction.status,
                "created_at": format_timestamp(transaction.created_at),
                "items_summary": ", ".join(item_names) if item_names else "-",
            })

        return history_data
    except Exception:
        logger.exception("Gagal mengambil riwayat transaksi")
        raise HTTPException(status_code=500, detail="Gagal memuat riwayat transaksi.")


@app.get("/reports/summary/")
def get_financial_summary(user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        items = (
            db.query(models.TransactionItem)
            .join(models.Transaction)
            .filter(models.Transaction.status == "Success")
            .all()
        )
        total_revenue = sum((item.subtotal or 0) for item in items)
        total_hpp = sum((item.hpp_at_sale or 0) * (item.quantity or 0) for item in items)
        total_items_sold = sum((item.quantity or 0) for item in items)
        total_expenses = db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).scalar() or 0
        gross_profit = total_revenue - total_hpp
        net_profit = gross_profit - total_expenses
        return {
            "total_revenue": total_revenue,
            "total_hpp": total_hpp,
            "total_expenses": total_expenses,
            "gross_profit": gross_profit,
            "net_profit": net_profit,
            "total_items_sold": total_items_sold,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal menyusun ringkasan keuangan")
        raise HTTPException(status_code=500, detail="Gagal memuat laporan keuangan.")


@app.get("/warehouse/")
def get_warehouse_stock(user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        return db.query(models.RawMaterial).all()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal mengambil data gudang")
        raise HTTPException(status_code=500, detail="Gagal memuat data gudang.")


@app.put("/warehouse/{material_id}")
def update_warehouse_stock(material_id: int, stock_data: StockUpdate, user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        if stock_data.new_stock < 0:
            raise HTTPException(status_code=400, detail="Stok tidak boleh negatif.")
        material = db.query(models.RawMaterial).filter(models.RawMaterial.id == material_id).first()
        if not material:
            raise HTTPException(status_code=404, detail="Bahan baku tidak ditemukan.")
        material.stock_quantity = stock_data.new_stock
        db.commit()
        return {"message": "Stok gudang berhasil diperbarui."}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal memperbarui stok gudang %s", material_id)
        raise HTTPException(status_code=500, detail="Gagal memperbarui stok gudang.")


@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        db_product = models.Product(**product.model_dump())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal membuat produk")
        raise HTTPException(status_code=500, detail="Gagal menambahkan menu.")


@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product_data: schemas.ProductCreate, user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")
        product.name = product_data.name
        product.category_id = product_data.category_id
        product.selling_price = product_data.selling_price
        product.base_hpp = product_data.base_hpp
        product.stock_quantity = product_data.stock_quantity
        product.is_active = product_data.is_active
        db.commit()
        db.refresh(product)
        return product
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal memperbarui produk %s", product_id)
        raise HTTPException(status_code=500, detail="Gagal memperbarui menu.")


@app.delete("/products/{product_id}")
def delete_product(product_id: int, user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")
        db.delete(product)
        db.commit()
        return {"message": "Menu berhasil dihapus."}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal menghapus produk %s", product_id)
        raise HTTPException(status_code=500, detail="Gagal menghapus menu.")


@app.get("/analytics/daily-revenue")
def get_daily_revenue(user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        thirty_days_ago = datetime.now(WIB).replace(tzinfo=None) - timedelta(days=30)
        results = (
            db.query(
                func.date(models.Transaction.created_at).label("tanggal"),
                func.sum(models.Transaction.total_amount).label("pendapatan"),
                func.count(models.Transaction.id).label("jumlah_order"),
            )
            .filter(
                models.Transaction.created_at >= thirty_days_ago,
                models.Transaction.status == "Success",
            )
            .group_by(func.date(models.Transaction.created_at))
            .order_by(func.date(models.Transaction.created_at))
            .all()
        )
        data = [
            {
                "tanggal": str(row.tanggal),
                "pendapatan": row.pendapatan or 0,
                "jumlah_order": row.jumlah_order or 0,
            }
            for row in results
        ]
        return {"status": "success", "data": data}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal mengambil analitik omzet harian")
        raise HTTPException(status_code=500, detail="Gagal memuat data analitik.")


def serialize_expense(expense: models.Expense) -> dict:
    return {
        "id": expense.id,
        "description": expense.description,
        "amount": expense.amount,
        "category": expense.category,
        "created_at": format_timestamp(expense.created_at),
    }


@app.get("/raw-materials/")
def list_raw_materials(user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        materials = db.query(models.RawMaterial).order_by(models.RawMaterial.name.asc()).all()
        return [
            {
                "id": material.id,
                "name": material.name,
                "stock_quantity": material.stock_quantity,
                "unit": material.unit,
                "unit_hpp": material.unit_hpp or 0,
            }
            for material in materials
        ]
    except Exception:
        logger.exception("Gagal mengambil bahan baku")
        raise HTTPException(status_code=500, detail="Gagal memuat bahan baku.")


@app.get("/expenses/")
def list_expenses(user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        expenses = db.query(models.Expense).order_by(models.Expense.created_at.desc()).all()
        return [serialize_expense(expense) for expense in expenses]
    except Exception:
        logger.exception("Gagal mengambil pengeluaran")
        raise HTTPException(status_code=500, detail="Gagal memuat data belanja.")


@app.post("/expenses/")
def create_expense(payload: schemas.ExpenseCreate, user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        expense = models.Expense(
            description=payload.description.strip(),
            amount=payload.amount,
            category=(payload.category or "Bahan Baku").strip() or "Bahan Baku",
            created_at=now_wib(),
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return serialize_expense(expense)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal mencatat pengeluaran")
        raise HTTPException(status_code=500, detail="Gagal mencatat belanja.")


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(status_code=404, detail="Catatan belanja tidak ditemukan.")
        db.delete(expense)
        db.commit()
        return {"message": "Catatan belanja dihapus."}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal menghapus pengeluaran %s", expense_id)
        raise HTTPException(status_code=500, detail="Gagal menghapus catatan belanja.")


@app.post("/hpp/calculate")
def calculate_hpp(payload: schemas.HppCalculateRequest, user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        if not payload.items:
            raise HTTPException(status_code=400, detail="Tambahkan minimal satu bahan baku.")
        lines = []
        total_cost = 0.0
        for item in payload.items:
            material = db.query(models.RawMaterial).filter(models.RawMaterial.id == item.raw_material_id).first()
            if not material:
                raise HTTPException(status_code=404, detail=f"Bahan baku ID {item.raw_material_id} tidak ditemukan.")
            unit_hpp = material.unit_hpp or 0
            line_cost = unit_hpp * item.quantity
            total_cost += line_cost
            lines.append({
                "raw_material_id": material.id,
                "name": material.name,
                "unit": material.unit,
                "quantity": item.quantity,
                "unit_hpp": unit_hpp,
                "line_cost": line_cost,
            })
        hpp_per_portion = total_cost / payload.portions
        return {
            "portions": payload.portions,
            "total_cost": total_cost,
            "hpp_per_portion": hpp_per_portion,
            "lines": lines,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal menghitung HPP")
        raise HTTPException(status_code=500, detail="Gagal menghitung HPP.")


@app.post("/hpp/apply")
def apply_hpp_to_product(payload: schemas.ApplyHppRequest, user: dict = Depends(require_roles("staff_hpp", "owner")), db: Session = Depends(get_db)):
    try:
        product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")
        product.base_hpp = round(payload.hpp_per_portion, 2)
        db.commit()
        db.refresh(product)
        return {
            "id": product.id,
            "name": product.name,
            "base_hpp": product.base_hpp,
            "selling_price": product.selling_price,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal menerapkan HPP ke produk")
        raise HTTPException(status_code=500, detail="Gagal menyimpan HPP ke menu.")


@app.get("/reports/profit-loss")
def get_profit_loss(user: dict = Depends(require_roles("owner")), db: Session = Depends(get_db)):
    try:
        items = (
            db.query(models.TransactionItem)
            .join(models.Transaction)
            .filter(models.Transaction.status == "Success")
            .all()
        )
        total_revenue = sum((item.subtotal or 0) for item in items)
        total_hpp = sum((item.hpp_at_sale or 0) * (item.quantity or 0) for item in items)
        expenses = db.query(models.Expense).all()
        total_expenses = sum((expense.amount or 0) for expense in expenses)
        by_category = {}
        for expense in expenses:
            key = expense.category or "Lainnya"
            by_category[key] = by_category.get(key, 0) + (expense.amount or 0)
        gross_profit = total_revenue - total_hpp
        return {
            "total_revenue": total_revenue,
            "total_hpp": total_hpp,
            "gross_profit": gross_profit,
            "total_expenses": total_expenses,
            "net_profit": gross_profit - total_expenses,
            "expense_breakdown": [
                {"category": category, "amount": amount}
                for category, amount in sorted(by_category.items(), key=lambda row: row[1], reverse=True)
            ],
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal menyusun laporan laba rugi")
        raise HTTPException(status_code=500, detail="Gagal memuat laporan laba-rugi.")


@app.get("/reports/best-selling")
def get_best_selling(user: dict = Depends(require_roles("owner")), limit: int = 8, db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(
                models.Product.id.label("product_id"),
                models.Product.name.label("name"),
                func.coalesce(func.sum(models.TransactionItem.quantity), 0).label("qty_sold"),
                func.coalesce(func.sum(models.TransactionItem.subtotal), 0).label("revenue"),
            )
            .join(models.TransactionItem, models.TransactionItem.product_id == models.Product.id)
            .join(models.Transaction, models.Transaction.id == models.TransactionItem.transaction_id)
            .filter(models.Transaction.status == "Success")
            .group_by(models.Product.id, models.Product.name)
            .order_by(func.sum(models.TransactionItem.quantity).desc())
            .limit(max(1, min(limit, 20)))
            .all()
        )
        return [
            {
                "product_id": row.product_id,
                "name": row.name,
                "qty_sold": int(row.qty_sold or 0),
                "revenue": row.revenue or 0,
            }
            for row in rows
        ]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Gagal mengambil produk terlaris")
        raise HTTPException(status_code=500, detail="Gagal memuat statistik produk.")

