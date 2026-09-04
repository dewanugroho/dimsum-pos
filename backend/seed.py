from database import SessionLocal, engine
import models

# Pastikan semua tabel (termasuk yang baru kita buat) dieksekusi oleh SQLAlchemy
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    # ==========================================
    # 1. SEED DATA PRODUK / MENU KASIR
    # ==========================================
    if db.query(models.Product).count() == 0:
        products_data = [
            # --- VARIAN SATUAN ---
            {"name": "Dimsum Ori", "category_id": 1, "selling_price": 2500, "base_hpp": 1350, "stock_quantity": 100},
            {"name": "Dimsum Wortel", "category_id": 1, "selling_price": 2500, "base_hpp": 1400, "stock_quantity": 100},
            {"name": "Dimsum Daun Bawang", "category_id": 1, "selling_price": 2500, "base_hpp": 1400, "stock_quantity": 100},
            {"name": "Dimsum Sosis", "category_id": 1, "selling_price": 3000, "base_hpp": 1650, "stock_quantity": 100},
            {"name": "Dimsum Keju", "category_id": 1, "selling_price": 3000, "base_hpp": 1700, "stock_quantity": 100},
            {"name": "Dimsum Jamur", "category_id": 1, "selling_price": 3000, "base_hpp": 1650, "stock_quantity": 100},

            # --- PAKET MENTAI ---
            {"name": "Dimsum Mentai Isi 3 pcs", "category_id": 2, "selling_price": 11000, "base_hpp": 6000, "stock_quantity": 50},
            {"name": "Dimsum Mentai Isi 5 pcs", "category_id": 2, "selling_price": 17000, "base_hpp": 9500, "stock_quantity": 50},
            {"name": "Dimsum Mentai Isi 8 pcs", "category_id": 2, "selling_price": 25000, "base_hpp": 14500, "stock_quantity": 50},

            # --- PAKET BOLOGNESE ---
            {"name": "Dimsum Bolognese Isi 3 pcs", "category_id": 3, "selling_price": 11000, "base_hpp": 6000, "stock_quantity": 50},
            {"name": "Dimsum Bolognese Isi 5 pcs", "category_id": 3, "selling_price": 17000, "base_hpp": 9500, "stock_quantity": 50},
            {"name": "Dimsum Bolognese Isi 8 pcs", "category_id": 3, "selling_price": 25000, "base_hpp": 14500, "stock_quantity": 50},

            # --- PAKET SAUS KEJU ---
            {"name": "Dimsum Saus Keju Isi 3 pcs", "category_id": 4, "selling_price": 11000, "base_hpp": 6000, "stock_quantity": 50},
            {"name": "Dimsum Saus Keju Isi 5 pcs", "category_id": 4, "selling_price": 17000, "base_hpp": 9500, "stock_quantity": 50},
            {"name": "Dimsum Saus Keju Isi 8 pcs", "category_id": 4, "selling_price": 25000, "base_hpp": 14500, "stock_quantity": 50},

            # --- PAKET CARBONARA ---
            {"name": "Dimsum Carbonara Isi 3 pcs", "category_id": 5, "selling_price": 11000, "base_hpp": 6000, "stock_quantity": 50},
            {"name": "Dimsum Carbonara Isi 5 pcs", "category_id": 5, "selling_price": 17000, "base_hpp": 9500, "stock_quantity": 50},
            {"name": "Dimsum Carbonara Isi 8 pcs", "category_id": 5, "selling_price": 25000, "base_hpp": 14500, "stock_quantity": 50},

            # --- EKSTRA SAUS ---
            {"name": "Chili Oil", "category_id": 6, "selling_price": 2500, "base_hpp": 1100, "stock_quantity": 200},
            {"name": "Keju (Ekstra)", "category_id": 6, "selling_price": 2000, "base_hpp": 900, "stock_quantity": 200},
            {"name": "Mentai (Ekstra)", "category_id": 6, "selling_price": 2000, "base_hpp": 900, "stock_quantity": 200},
            {"name": "Bolognese (Ekstra)", "category_id": 6, "selling_price": 2000, "base_hpp": 900, "stock_quantity": 200},
            {"name": "Carbonara (Ekstra)", "category_id": 6, "selling_price": 2000, "base_hpp": 900, "stock_quantity": 200},
            {"name": "Saus Sambal", "category_id": 6, "selling_price": 500, "base_hpp": 200, "stock_quantity": 200},
        ]
        for item in products_data:
            db.add(models.Product(**item))
        db.commit()
        print(f"✅ Berhasil memasukkan {len(products_data)} menu ke dalam database!")
    else:
        print("⏭️ Data menu produk sudah ada, melewati proses seed produk.")

    # ==========================================
    # 2. SEED DATA BAHAN BAKU (GUDANG)
    # ==========================================
    if db.query(models.RawMaterial).count() == 0:
        materials_data = [
            {"name": "Paha Ayam Fillet (+Jasa Giling)", "unit": "gram", "unit_hpp": 50.00, "stock_quantity": 2000},
            {"name": "Saori Saus Tiram", "unit": "sachet", "unit_hpp": 3000.00, "stock_quantity": 10},
            {"name": "Minyak Wijen Lee Kum Kee", "unit": "ml", "unit_hpp": 469.57, "stock_quantity": 115},
            {"name": "Knorr Chicken Powder", "unit": "gram", "unit_hpp": 120.00, "stock_quantity": 200},
            {"name": "Gula Pasir", "unit": "gram", "unit_hpp": 18.00, "stock_quantity": 1000},
            {"name": "Bawang Putih Bubuk Desaku", "unit": "sachet", "unit_hpp": 1000.00, "stock_quantity": 10},
            {"name": "Labu Siam", "unit": "gram", "unit_hpp": 8.00, "stock_quantity": 1000},
            {"name": "Tepung Tapioka", "unit": "gram", "unit_hpp": 13.00, "stock_quantity": 1000},
            {"name": "Tepung Protein (ISP)", "unit": "gram", "unit_hpp": 130.00, "stock_quantity": 1000},
            {"name": "Keju Prochiz Gold Slice", "unit": "slice", "unit_hpp": 1250.00, "stock_quantity": 24},
            {"name": "Jamur Kuping Kering", "unit": "gram", "unit_hpp": 200.00, "stock_quantity": 100},
            {"name": "Wortel", "unit": "buah", "unit_hpp": 2000.00, "stock_quantity": 5},
            {"name": "Daun Bawang", "unit": "tangkai", "unit_hpp": 2000.00, "stock_quantity": 10},
            {"name": "Sosis Assalam", "unit": "pcs", "unit_hpp": 937.50, "stock_quantity": 32},
            {"name": "Saus Mentai Prima Agung", "unit": "gram", "unit_hpp": 54.00, "stock_quantity": 1000},
            {"name": "Saus Keju Prima Agung", "unit": "gram", "unit_hpp": 45.00, "stock_quantity": 1000},
            {"name": "Saus Carbonara Prima Agung", "unit": "gram", "unit_hpp": 65.00, "stock_quantity": 1000},
            {"name": "Saus Bolognese Mc Lewis", "unit": "gram", "unit_hpp": 33.00, "stock_quantity": 1000},
            {"name": "Bubuk Aonori", "unit": "gram", "unit_hpp": 480.00, "stock_quantity": 50},
            {"name": "Wadah Chili Oil", "unit": "pcs", "unit_hpp": 280.00, "stock_quantity": 50},
            {"name": "Aluminium Foil BX 984519 (Isi 3)", "unit": "pcs", "unit_hpp": 800.00, "stock_quantity": 100},
            {"name": "Aluminium Foil OX-250 (Isi 5)", "unit": "pcs", "unit_hpp": 900.00, "stock_quantity": 100},
            {"name": "Aluminium Foil P380 (Isi 8)", "unit": "pcs", "unit_hpp": 1450.00, "stock_quantity": 100},
            {"name": "Sterofoam Besar (Bubur)", "unit": "pcs", "unit_hpp": 400.00, "stock_quantity": 100},
            {"name": "Sterofoam Kecil (Burger)", "unit": "pcs", "unit_hpp": 275.00, "stock_quantity": 200},
            {"name": "Saus Sachet Bening", "unit": "pcs", "unit_hpp": 250.00, "stock_quantity": 100},
            {"name": "Sumpit", "unit": "pasang", "unit_hpp": 260.00, "stock_quantity": 50},
            {"name": "Stiker Logo Dimsum Gembul", "unit": "pcs", "unit_hpp": 100.00, "stock_quantity": 240},
            {"name": "Gas LPG", "unit": "batch", "unit_hpp": 2000.00, "stock_quantity": 10},
            
            # Intermediate Goods (Bahan Olahan)
            {"name": "Kulit Dimsum", "unit": "lembar", "unit_hpp": 200.00, "stock_quantity": 400},
            {"name": "Adonan Dimsum (Sudah Jadi)", "unit": "pcs", "unit_hpp": 1250.00, "stock_quantity": 100}
        ]
        for item in materials_data:
            db.add(models.RawMaterial(**item))
        db.commit()
        print(f"✅ Berhasil memasukkan {len(materials_data)} Bahan Baku ke Gudang!")
    else:
        print("⏭️ Data bahan baku sudah ada, melewati proses seed bahan baku.")

    # ==========================================
    # 3. SEED DATA RESEP (BILL OF MATERIALS)
    # ==========================================
    # Kita cari ID untuk "Dimsum Mentai Isi 5 pcs" berdasarkan namanya di database
    mentai_5 = db.query(models.Product).filter(models.Product.name == "Dimsum Mentai Isi 5 pcs").first()
    
    if mentai_5:
        # Cek apakah resep untuk produk ini sudah ada
        if db.query(models.RecipeItem).filter(models.RecipeItem.product_id == mentai_5.id).count() == 0:
            
            # Fungsi kecil untuk mencari ID bahan baku dengan mudah
            def get_material(name):
                return db.query(models.RawMaterial).filter(models.RawMaterial.name == name).first().id

            resep_mentai_5 = [
                {"product_id": mentai_5.id, "raw_material_id": get_material("Adonan Dimsum (Sudah Jadi)"), "quantity_needed": 5},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Kulit Dimsum"), "quantity_needed": 5},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Saus Mentai Prima Agung"), "quantity_needed": 45},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Bubuk Aonori"), "quantity_needed": 2.5},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Aluminium Foil OX-250 (Isi 5)"), "quantity_needed": 1},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Sterofoam Besar (Bubur)"), "quantity_needed": 1},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Sumpit"), "quantity_needed": 1},
                {"product_id": mentai_5.id, "raw_material_id": get_material("Stiker Logo Dimsum Gembul"), "quantity_needed": 1},
            ]
            
            for bahan in resep_mentai_5:
                db.add(models.RecipeItem(**bahan))
            db.commit()
            print("✅ Resep 'Paket Mentai Isi 5' berhasil dipasang ke sistem!")
        else:
            print("⏭️ Resep untuk 'Paket Mentai Isi 5' sudah ada.")
    else:
        print("❌ Peringatan: Produk 'Dimsum Mentai Isi 5 pcs' tidak ditemukan di database.")

    db.close()
    print("🎉 Proses Seeding Selesai!")

if __name__ == "__main__":
    seed_data()