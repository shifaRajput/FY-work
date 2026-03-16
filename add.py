from app import app, db
from model import Product, Media

# Full product data including specs to prevent the 'split' error
products_to_restore = [
    {
        "name": "HP Laptop",
        "brand": "HP",
        "real_price": 35000.0,
        "old_price": 40000.0,
        "device_type": "laptop",
        "grade": "A",
        "discount": True,
        "tagline": "Professional performance for your work.",
        "key_specs": "8GB RAM, 256GB SSD, Intel i5, 15.6 inch Screen", # Added comma-separated specs
        "product_information": "This HP Laptop is refurbished to grade A standards.",
        "stock": 10,
        "media_files": ["aaple.jpg", "apple.jpg"]
    },
    {
        "name": "iPhone 13",
        "brand": "Apple",
        "real_price": 45000.0,
        "old_price": 52000.0,
        "device_type": "smartphone",
        "grade": "B",
        "discount": False,
        "tagline": "The classic iPhone experience.",
        "key_specs": "128GB Storage, A15 Bionic, Dual Camera", # Added comma-separated specs
        "product_information": "Fully tested second-hand iPhone 13.",
        "stock": 5,
        "media_files": ["applle.jpg"]
    }
]

def restore_db():
    with app.app_context():
        # Optional: Clear existing data before restoration to avoid duplicates
        # db.session.query(Media).delete()
        # db.session.query(Product).delete()
        
        for item in products_to_restore:
            # 1. Create the Product with ALL fields
            new_product = Product(
                name=item["name"],
                brand=item["brand"],
                real_price=item["real_price"],
                old_price=item["old_price"],
                device_type=item["device_type"],
                grade=item["grade"],
                discount=item["discount"],
                tagline=item["tagline"],
                key_specs=item["key_specs"], # This prevents the 'split' error
                product_information=item["product_information"],
                stock=item["stock"]
            )
            db.session.add(new_product)
            db.session.commit() 
            
            # 2. Add associated Media
            for filename in item["media_files"]:
                new_media = Media(
                    filename=filename,
                    filetype="image",
                    product_id=new_product.id
                )
                db.session.add(new_media)
            
            db.session.commit()
            print(f"Restored: {new_product.name} with ID: {new_product.id}")

if __name__ == "__main__":
    restore_db()