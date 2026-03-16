from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100))
    #description = db.Column(db.Text)

    real_price = db.Column(db.Float, nullable=False)
    old_price = db.Column(db.Float)

    device_type = db.Column(db.String(50), nullable=False)

    grade = db.Column(db.String(20), nullable=False)

    discount = db.Column(db.Boolean, default=False)
    tagline = db.Column(db.String(300))
    key_specs = db.Column(db.Text)
    product_information = db.Column(db.Text)
    stock = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    media = db.relationship(
        'Media',
        backref='product',
        lazy=True,
        cascade="all, delete"
    )

    @property
    def product_id(self):
        # This creates the string "2MB-1001"
        # We use display_id to match your HTML template
        return f"2MB-{self.id + 1000}" if self.id else "New"
    
class Media(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    filename = db.Column(db.String(200))
    filetype = db.Column(db.String(20))  # image or video

    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15))
    password = db.Column(db.String(200))
    address = db.Column(db.Text)


    sell_requests = db.relationship('SellRequest', backref='user', lazy=True)


class SellRequest(db.Model):
    __tablename__ = 'sell_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, default=0)
    condition = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, default="")
    photos = db.Column(db.Text, default="")
    status = db.Column(db.String(30), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<SellRequest US{self.id:03d} - {self.brand} {self.model}>' 

# In model.py
class Cart(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)       

class Orders(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    total_price = db.Column(db.Float)
    delivery_address = db.Column(db.Text)
    created_at = db.Column(db.String(50)) 
    status = db.Column(db.String(50), default='Pending')
    date_ordered = db.Column(db.String(50))
    date_packed = db.Column(db.String(50))
    date_shipped = db.Column(db.String(50))
    date_out_for_delivery = db.Column(db.String(50))
    date_delivered = db.Column(db.String(50))
    date_return_requested = db.Column(db.String(50)) 
    payment_method = db.Column(db.String(50))