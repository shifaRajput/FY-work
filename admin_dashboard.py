from flask import Blueprint, jsonify, render_template, request, redirect, url_for, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import sqlite3
import os
import json

# 1. Define the Blueprint
admin_dashboard_bp = Blueprint('admin_dashboard', __name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
if not os.path.isdir(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 2. Database Models [cite: 4]
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    is_admin = db.Column(db.Boolean, default=False)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True) # [cite: 4]
    name = db.Column(db.String(100))
    brand = db.Column(db.String(100))
    real_price = db.Column(db.Float)
    stock = db.Column(db.Integer)
    device_type = db.Column(db.String(50))
    old_price = db.Column(db.Float)
    discount = db.Column(db.Boolean, default=False)
    grade = db.Column(db.String(10))
    tagline = db.Column(db.String(150))
    key_specs = db.Column(db.Text)
    product_information = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    media = db.relationship('Media', backref='product', lazy=True, cascade="all, delete-orphan")

class Media(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(150))
    filetype = db.Column(db.String(20))
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))

# 3. SQLITE CONFIG [cite: 5, 13]
SQLITE_DB = os.path.join(BASE_DIR, "users.db")

def get_sqlite_conn():
    conn = sqlite3.connect(SQLITE_DB, timeout=30) # Increased timeout to prevent locking
    conn.row_factory = sqlite3.Row
    return conn

# ================= CUSTOM JS ROUTES =================
@admin_dashboard_bp.route('/admin_dashboard.js')
def serve_js():
    return send_from_directory(os.getcwd(), 'admin_dashboard.js')

@admin_dashboard_bp.route('/add_product.js')
def serve_add_js():
    return send_from_directory(os.getcwd(), 'add_product.js')

# -------------------------
# CORE ROUTES
# -------------------------
@admin_dashboard_bp.route('/admin')
def admin_dashboard():
    if not session.get("is_admin"):
        return redirect(url_for('admin_login.login_page'))
    products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin_dashboard.html', products=products)

@admin_dashboard_bp.route('/admin/add', methods=['GET', 'POST'])
def add_product():
    if not session.get('is_admin'): return redirect(url_for('admin_login.login_page'))
    if request.method == 'POST':
        product = Product(
            name=request.form['name'],
            brand=request.form['brand'].strip().title(),
            real_price=float(request.form['real_price']),
            old_price=float(request.form.get('old_price')) if request.form.get('old_price') else None,
            device_type=request.form['device_type'].lower(),
            discount=True if request.form.get('discount') else False,
            stock=int(request.form['stock']),
            tagline=request.form.get("tagline"),
            key_specs=request.form.get("key_specs"),
            product_information=request.form.get("product_information"),
            grade=request.form.get('grade')
        )
        db.session.add(product)
        db.session.commit()
        files = request.files.getlist('media')
        allowed_images, allowed_videos = ('.jpg', '.jpeg', '.png', '.webp'), ('.mp4', '.mov', '.avi')
        for file in files:
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                filetype = 'image' if filename.lower().endswith(allowed_images) else 'video'
                db.session.add(Media(filename=filename, filetype=filetype, product_id=product.id))
        db.session.commit()
        return redirect(url_for('admin_dashboard.admin_dashboard'))
    return render_template('add_product.html')

# FIXED: Corrected route for edit_product to resolve BuildError
@admin_dashboard_bp.route('/admin/edit/<int:product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    if not session.get('is_admin'): return redirect(url_for('admin_login.login_page'))
    product = Product.query.get_or_404(product_id)
    if request.method == 'POST':
        product.name = request.form['name']
        product.brand = request.form['brand']
        product.real_price = float(request.form['real_price'])
        product.old_price = float(request.form.get('old_price')) if request.form.get('old_price') else None
        product.stock = int(request.form['stock'])
        product.device_type = request.form['device_type'].lower()
        product.grade = request.form.get('grade')
        product.tagline = request.form.get("tagline")
        product.key_specs = request.form.get("key_specs")
        product.product_information = request.form.get("product_information")
        product.discount = True if request.form.get('discount') else False
        
        # Handle media removals
        removed_files_json = request.form.get('removed_files', '[]')
        files_to_remove = json.loads(removed_files_json)
        for fname in files_to_remove:
            media_to_del = Media.query.filter_by(product_id=product.id, filename=fname).first()
            if media_to_del:
                file_path = os.path.join(UPLOAD_FOLDER, fname)
                if os.path.exists(file_path): os.remove(file_path)
                db.session.delete(media_to_del)
        
        # Handle new uploads
        new_files = request.files.getlist('media')
        allowed_images, allowed_videos = ('.jpg', '.jpeg', '.png', '.webp'), ('.mp4', '.mov', '.avi')
        for file in new_files:
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                ftype = 'image' if filename.lower().endswith(allowed_images) else 'video'
                db.session.add(Media(filename=filename, filetype=ftype, product_id=product.id))
        
        db.session.commit()
        return redirect(url_for('admin_dashboard.admin_dashboard'))
    return render_template('edit_product.html', product=product)

@admin_dashboard_bp.route('/admin/delete/<int:product_id>', methods=['POST'])
def delete_product(product_id):
    if not session.get('is_admin'): return "Unauthorized", 403
    product = Product.query.get_or_404(product_id)
    for media in product.media:
        file_path = os.path.join(UPLOAD_FOLDER, media.filename)
        if os.path.exists(file_path): os.remove(file_path)
        db.session.delete(media)
    db.session.delete(product)
    db.session.commit()
    return "", 200

# -------------------------
# REST OF ROUTES (ANALYTICS, ORDERS, SELL, REPAIRS) [cite: 5, 13]
# -------------------------
@admin_dashboard_bp.route('/admin/analytics')
def analytics_page():
    if not session.get("is_admin"): return redirect(url_for('admin_login.login_page'))
    try:
        conn = get_sqlite_conn()
        total_customers = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] or 0
        rev_row = conn.execute("SELECT SUM(total_price), AVG(total_price) FROM orders WHERE status NOT IN ('Cancelled', 'Returned')").fetchone()
        total_revenue = round(rev_row[0] or 0, 2)
        avg_order_value = round(rev_row[1] or 0, 2)
        active_users = conn.execute("SELECT COUNT(DISTINCT user_id) FROM orders").fetchone()[0] or 0
        conversion_rate = round((active_users / total_customers * 100) if total_customers > 0 else 0, 1)
        total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0] or 0
        total_repairs = conn.execute("SELECT COUNT(*) FROM repair_bookings").fetchone()[0] or 0
        total_sells = conn.execute("SELECT COUNT(*) FROM sell_requests").fetchone()[0] or 0
        growth_data = conn.execute("SELECT * FROM customer_growth ORDER BY id ASC").fetchall()
        conn.close()
        return render_template('analytics.html', total_customers=total_customers, total_revenue=total_revenue, avg_order_value=avg_order_value, conversion_rate=conversion_rate, active_users=active_users, total_orders=total_orders, total_repairs=total_repairs, total_sells=total_sells, growth_labels=[row['month'] for row in growth_data], growth_values=[row['customer_count'] for row in growth_data])
    except Exception as e: return f"Database error: {e}"

@admin_dashboard_bp.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    try:
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT o.id AS order_id, u.user_id, u.name AS customer_name, p.name AS product_name, o.quantity, o.total_price, o.status, o.created_at FROM orders o LEFT JOIN users u ON o.user_id = u.user_id LEFT JOIN products p ON o.product_id = p.product_id WHERE o.status NOT IN ('pending', 'Cancelled', 'Returned') ORDER BY o.created_at DESC").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e: return jsonify({"error": str(e)}), 500

@admin_dashboard_bp.route("/admin/sell")
def admin_sell_page():
    if not session.get("is_admin"): return redirect(url_for('admin_login.login_page'))
    return render_template("admin_sell.html")

@admin_dashboard_bp.route('/admin/repairs')
def admin_repair_page():
    if not session.get("is_admin"): return redirect(url_for('admin_login.login_page'))
    return render_template('repair_admin.html')