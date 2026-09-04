from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel
import midtransclient 
import models
import schemas
from database import engine, get_db
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# 1. INISIALISASI APLIKASI & DATABASE
# ==========================================
models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Dimsum Gembul POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. KONFIGURASI KEAMANAN (JWT & MIDTRANS)
# ==========================================
# --- UBAH BAGIAN INI ---
SECRET_KEY = os.getenv("SECRET_KEY") 
ALGORITHM = "HS256"

snap_api = midtransclient.Snap(
    is_production=False,
    server_key=os.getenv("MIDTRANS_SERVER_KEY") 
)

class PinRequest(BaseModel):
    pin: str

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Akses Ditolak. Token hilang.")
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi Habis.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token Palsu.")

# ==========================================
# 3. ENDPOINT PUBLIK (TIDAK PERLU TOKEN)
# ==========================================
@app.get("/")
def read_root(): 
    return {"message": "Selamat datang di API Kasir Dimsum Gembul!"}

@app.post("/verify-pin")
def verify_pin(req: PinRequest):
    if req.pin == "160597":
        token = jwt.encode({"sub": "owner_dewa"}, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="PIN Salah")

@app.get("/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Product).offset(skip).limit(limit).all()

@app.post("/transactions/")
def create_transaction(transaction_data: schemas.TransactionCreate, db: Session = Depends(get_db)):
    receipt_id = f"TRX-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    total_amount = 0
    
    for item in transaction_data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        total_amount += product.selling_price * item.quantity
        
    initial_status = "Success" if transaction_data.payment_method == "CASH" else "Pending"
    new_transaction = models.Transaction(id=receipt_id, user_id=1, payment_method=transaction_data.payment_method, total_amount=total_amount, status=initial_status)
    db.add(new_transaction)
    
    for item in transaction_data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        product.stock_quantity -= item.quantity
        resep_items = db.query(models.RecipeItem).filter(models.RecipeItem.product_id == product.id).all()
        for resep in resep_items:
            bahan = db.query(models.RawMaterial).filter(models.RawMaterial.id == resep.raw_material_id).first()
            if bahan: bahan.stock_quantity -= (resep.quantity_needed * item.quantity)
        
        new_item = models.TransactionItem(transaction_id=receipt_id, product_id=product.id, quantity=item.quantity, unit_price=product.selling_price, hpp_at_sale=product.base_hpp, subtotal=product.selling_price * item.quantity)
        db.add(new_item)
        
    payment_url = None
    if transaction_data.payment_method == "QRIS":
        param = {
            "transaction_details": {"order_id": receipt_id, "gross_amount": int(total_amount)},
            "customer_details": {"first_name": "Pelanggan", "last_name": "Dimsum Gembul"}
        }
        try:
            snap_response = snap_api.create_transaction(param)
            payment_url = snap_response['redirect_url']
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Gagal koneksi Midtrans: {str(e)}")
            
    db.commit()
    db.refresh(new_transaction)
    
    return {"id": new_transaction.id, "payment_method": new_transaction.payment_method, "status": new_transaction.status, "payment_url": payment_url}

@app.post("/webhook/")
async def midtrans_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    order_id = payload.get('order_id')
    transaction_status = payload.get('transaction_status')
    if order_id and transaction_status == 'settlement':
        transaction = db.query(models.Transaction).filter(models.Transaction.id == order_id).first()
        if transaction and transaction.status == "Pending":
            transaction.status = "Success"
            db.commit()
    return {"status": "ok"}

@app.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    return {"id": transaction.id, "status": transaction.status}

@app.get("/history/")
def get_transaction_history(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).order_by(models.Transaction.id.desc()).all()
    history_data = []
    
    for t in transactions:
        items = db.query(models.TransactionItem).filter(models.TransactionItem.transaction_id == t.id).all()
        item_names = []
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                item_names.append(f"{product.name} ({item.quantity}x)")
                
        history_data.append({
            "id": t.id,
            "total_amount": t.total_amount,
            "payment_method": t.payment_method,
            "status": t.status,
            "items_summary": ", ".join(item_names)
        })
        
    return history_data

# ==========================================
# 4. ENDPOINT PRIVAT (WAJIB TOKEN OWNER)
# ==========================================
@app.get("/reports/summary/")
def get_financial_summary(user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    items = db.query(models.TransactionItem).join(models.Transaction).filter(models.Transaction.status == "Success").all()
    total_revenue = sum(item.subtotal for item in items); total_hpp = sum(item.hpp_at_sale * item.quantity for item in items)
    return {"total_revenue": total_revenue, "total_hpp": total_hpp, "net_profit": total_revenue - total_hpp, "total_items_sold": sum(item.quantity for item in items)}

@app.get("/warehouse/")
def get_warehouse_stock(user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    return db.query(models.RawMaterial).all()

class StockUpdate(BaseModel): 
    new_stock: float

@app.put("/warehouse/{material_id}")
def update_warehouse_stock(material_id: int, stock_data: StockUpdate, user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    material = db.query(models.RawMaterial).filter(models.RawMaterial.id == material_id).first()
    material.stock_quantity = stock_data.new_stock; db.commit(); return {"message": "Sukses"}

@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product); db.commit(); db.refresh(db_product); return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product_data: schemas.ProductCreate, user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    product.name = product_data.name; product.selling_price = product_data.selling_price; product.base_hpp = product_data.base_hpp; product.stock_quantity = product_data.stock_quantity
    db.commit(); db.refresh(product); return product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, user: dict = Depends(verify_token), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    db.delete(product); db.commit(); return {"message": "Dihapus"}