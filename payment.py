from flask import (Blueprint, render_template, request, jsonify,
                   session, redirect, url_for, send_from_directory)
import sqlite3
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

payment_bp = Blueprint('payment', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "users.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


# ── Email Helper ───────────────────────────────────────────────────────────────

def send_order_email(to_email, user_name):
    sender_email    = "2mbcomputers@gmail.com"
    sender_password = "topb lllq rxcb zeyn"

    msg = MIMEMultipart()
    msg['From']    = sender_email
    msg['To']      = to_email
    msg['Subject'] = "Order Confirmation - 2 MB Computers"

    body = (
        f"Hello {user_name},\n\n"
        "Your order has been successfully placed! Thanks for choosing 2MB Computers.\n\n"
        "You can track your order status in the My Orders section on our website."
    )
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Email failed: {e}")


# ── Routes ─────────────────────────────────────────────────────────────────────

@payment_bp.route('/payment')
def home():
    return redirect(url_for('payment.checkout'))


@payment_bp.route('/payment.js')
def serve_js():
    return send_from_directory(BASE_DIR, 'payment.js')


@payment_bp.route('/checkout')
def checkout():
    if 'user_email' not in session:
        return redirect(url_for('auth.auth_page'))

    product_id = request.args.get('product_id', type=int)
    conn = get_db()
    user    = conn.execute("SELECT * FROM users WHERE email = ?", (session['user_email'],)).fetchone()
    product = None
    if product_id:
        product = conn.execute(
            "SELECT id, name, brand, real_price, old_price, grade FROM product WHERE id = ?",
            (product_id,)
        ).fetchone()
    conn.close()

    return render_template(
        "payment.html",
        user=user,
        product=dict(product) if product else None,
        product_id=product_id
    )


@payment_bp.route('/api/get-product/<int:product_id>')
def get_product(product_id):
    conn = get_db()
    p = conn.execute(
        "SELECT id, name, brand, real_price, old_price, grade FROM product WHERE id = ?",
        (product_id,)
    ).fetchone()
    conn.close()
    if not p:
        return jsonify({"success": False, "error": "Product not found"}), 404
    return jsonify({"success": True, "product": dict(p)})


@payment_bp.route('/api/get-user', methods=['POST'])
def get_user_by_name():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"success": False})
    conn = get_db()
    user = conn.execute(
        "SELECT phone, address FROM users WHERE name = ? COLLATE NOCASE", (name,)
    ).fetchone()
    conn.close()
    if user:
        return jsonify({"success": True, "phone": user['phone'] or "", "address": user['address'] or ""})
    return jsonify({"success": False})


# ── MODIFIED: Pull from the 'cart' table instead of 'orders' ───────────────────
@payment_bp.route('/api/my-orders')
def get_my_orders():
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn  = get_db()
    user  = conn.execute(
        "SELECT user_id, name FROM users WHERE email = ?", (session['user_email'],)
    ).fetchone()
    
    # Now successfully grabs items from the user's cart
    cart_items = conn.execute("""
        SELECT c.id AS order_id, c.quantity, (p.real_price * c.quantity) AS total_price, 'pending' as status,
               p.name AS product_name, p.brand AS product_brand, p.real_price, p.grade
        FROM cart c
        JOIN product p ON c.product_id = p.id
        WHERE c.user_id = ?
    """, (user['user_id'],)).fetchall()
    
    conn.close()
    return jsonify({"username": user['name'], "orders": [dict(r) for r in cart_items]})


# ── MODIFIED: Read from cart, insert to orders, then clear cart ────────────────
@payment_bp.route('/api/pay/<int:order_id>', methods=['POST'])
def process_payment(order_id):
    """Confirm payment for a pending cart order and redirect to My Orders."""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data        = request.json
    method      = data.get('payMethod')
    new_address = data.get('address')
    new_phone   = data.get('phone')

    conn = get_db()
    c    = conn.cursor()
    user = c.execute(
        "SELECT user_id, name, email, phone, address FROM users WHERE email = ?",
        (session['user_email'],)
    ).fetchone()
    u_id = user['user_id']

    # 1. Look up the cart item
    cart_item = c.execute("SELECT product_id, quantity FROM cart WHERE id = ? AND user_id = ?", (order_id, u_id)).fetchone()

    if cart_item:
        product = c.execute("SELECT real_price FROM product WHERE id = ?", (cart_item['product_id'],)).fetchone()
        total_price = product['real_price'] * cart_item['quantity']

        # 2. Insert into the official orders table
        c.execute("""
            INSERT INTO orders (user_id, product_id, quantity, total_price, status, payment_method, delivery_address)
            VALUES (?, ?, ?, ?, 'Order Placed', ?, ?)
        """, (u_id, cart_item['product_id'], cart_item['quantity'], total_price, method, new_address))

        # 3. Remove it from the cart
        c.execute("DELETE FROM cart WHERE id = ?", (order_id,))

    # Update user address/phone if it was previously empty
    if not user['phone'] or not user['address']:
        c.execute(
            "UPDATE users SET phone = COALESCE(phone, ?), address = COALESCE(address, ?) WHERE user_id = ?",
            (new_phone, new_address, u_id)
        )

    conn.commit()
    conn.close()

    threading.Thread(target=send_order_email, args=(user['email'], user['name'])).start()

    # ✅ Tell the frontend to redirect to My Orders
    return jsonify({"success": True, "redirect": "/myorders"})


# ── Pay Now (Buy-Now flow – single product, no cart) ──────────────────────────
# (No changes needed here! This was already working perfectly)

@payment_bp.route('/api/pay-now', methods=['POST'])
def pay_now():
    """Create + immediately confirm an order from the Buy-Now button."""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data       = request.json
    product_id = data.get('product_id')
    quantity   = int(data.get('quantity', 1))
    method     = data.get('payMethod')
    address    = data.get('address')
    phone      = data.get('phone')

    if not product_id or not method or not address:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    conn = get_db()
    c    = conn.cursor()

    user = c.execute(
        "SELECT user_id, name, email, phone, address FROM users WHERE email = ?",
        (session['user_email'],)
    ).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    product = c.execute(
        "SELECT id, name, real_price FROM product WHERE id = ?", (product_id,)
    ).fetchone()
    if not product:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    total_price = product['real_price'] * quantity

    c.execute("""
        INSERT INTO orders
            (user_id, product_id, quantity, total_price, status, payment_method, delivery_address)
        VALUES (?, ?, ?, ?, 'Order Placed', ?, ?)
    """, (user['user_id'], product_id, quantity, total_price, method, address))

    if not user['phone'] or not user['address']:
        c.execute(
            "UPDATE users SET phone = COALESCE(phone, ?), address = COALESCE(address, ?) WHERE user_id = ?",
            (phone, address, user['user_id'])
        )

    conn.commit()
    conn.close()

    threading.Thread(target=send_order_email, args=(user['email'], user['name'])).start()

    # ✅ Tell the frontend to redirect to My Orders
    return jsonify({"success": True, "total_price": total_price, "redirect": "/myorders"})