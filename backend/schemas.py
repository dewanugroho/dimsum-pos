from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

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
    quantity: int

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

class TransactionResponse(BaseModel):
    id: str
    payment_method: str
    total_amount: float
    status: str
    created_at: datetime
    items: List[TransactionItemResponse]
    
    class Config:
        from_attributes = True