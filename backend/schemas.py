from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

# Skema Dasar (Atribut yang selalu ada)
class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    selling_price: float
    base_hpp: float
    stock_quantity: int = 0
    is_active: bool = True

# Skema saat menerima data baru (Create)
class ProductCreate(ProductBase):
    pass

# Skema saat mengembalikan data ke frontend (Read/Response)
class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True  # Memungkinkan Pydantic membaca data dari SQLAlchemy

# --- SKEMA TRANSAKSI (KASIR) ---

# Data yang dikirim dari frontend saat checkout
class TransactionItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class TransactionCreate(BaseModel):
    payment_method: str
    amount_paid: float
    items: List[TransactionItemCreate]

# Data balikan (Response) untuk dicetak di struk
class TransactionItemResponse(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float
    
    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1)
    amount: float = Field(gt=0)
    category: str = "Bahan Baku"


class Expense(BaseModel):
    id: int
    description: str
    amount: float
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


class HppLineInput(BaseModel):
    raw_material_id: int
    quantity: float = Field(gt=0)


class HppCalculateRequest(BaseModel):
    portions: float = Field(gt=0)
    items: List[HppLineInput]


class ApplyHppRequest(BaseModel):
    product_id: int
    hpp_per_portion: float = Field(ge=0)


class TransactionResponse(BaseModel):
    id: str
    payment_method: str
    total_amount: float
    status: str
    created_at: datetime
    items: List[TransactionItemResponse]
    
    class Config:
        from_attributes = True


# ─── AUTH / RBAC ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Payload POST /auth/login"""
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Response sukses login — berisi JWT + info akun"""
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """Data akun (tanpa password_hash) — untuk endpoint /auth/me"""
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
