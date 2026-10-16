from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


def jakarta_now():
    return datetime.now(ZoneInfo("Asia/Jakarta")).replace(tzinfo=None)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, index=True) # Untuk sementara integer biasa
    name = Column(String, index=True)
    selling_price = Column(Float)
    base_hpp = Column(Float)
    stock_quantity = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relasi balik ke detail transaksi
    transaction_items = relationship("TransactionItem", back_populates="product")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True) # Menggunakan String untuk nomor resi (misal: TRX-001)
    user_id = Column(Integer) # ID Kasir
    payment_method = Column(String) # Cash / QRIS
    total_amount = Column(Float)
    status = Column(String, default="Success")
    created_at = Column(DateTime, default=jakarta_now, nullable=False)

    # Relasi ke detail item yang dibeli
    items = relationship("TransactionItem", back_populates="transaction")

class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    unit_price = Column(Float) # Harga jual saat transaksi terjadi
    hpp_at_sale = Column(Float) # HPP saat transaksi terjadi (untuk laporan laba/rugi)
    subtotal = Column(Float)

    # Definisi relasi
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product", back_populates="transaction_items")

# --- TABEL BAHAN BAKU (GUDANG) ---
class RawMaterial(Base):
    __tablename__ = "raw_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    stock_quantity = Column(Float)
    unit = Column(String)
    unit_hpp = Column(Float)

# --- TABEL RESEP (HUBUNGAN PRODUK & BAHAN BAKU) ---
class RecipeItem(Base):
    __tablename__ = "recipe_items"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    raw_material_id = Column(Integer, ForeignKey("raw_materials.id"))
    quantity_needed = Column(Float)

    product = relationship("Product")
    raw_material = relationship("RawMaterial")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, default="Bahan Baku")
    created_at = Column(DateTime, default=jakarta_now, nullable=False)


# --- TABEL USER (RBAC) ---
VALID_ROLES = {"owner", "kasir", "staff_hpp"}

class User(Base):
    """
    Akun pengguna sistem POS.

    Role:
      owner      — akses penuh (dashboard, laporan, gudang, CRUD menu)
      kasir      — akses transaksi kasir saja
      staff_hpp  — akses pencatatan belanja & kalkulator HPP
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    # bcrypt hash — JANGAN simpan plain-text password di sini
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)          # "owner" | "kasir" | "staff_hpp"
    full_name = Column(String, nullable=True)      # Nama tampilan opsional
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=jakarta_now, nullable=False)