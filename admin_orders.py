from flask import Blueprint, jsonify, render_template, send_from_directory, redirect, request, session, url_for
import sqlite3
import os
from model import db, Orders, User, Product
from datetime import datetime

admin_orders_bp = Blueprint('admin_orders', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "users.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M")

# ─── ASSETS ────────────────────────────────────────────────────────────────────

@admin_orders_bp.route('/admin_orders.js')
def serve_admin_js():
    return send_from_directory(BASE_DIR, 'admin_orders.js')

# ─── PAGE ──────────────────────────────────────────────────────────────────────

@admin_orders_bp.route('/admin/orders')
def admin_orders_page():
    if not session.get("is_admin"):
        return redirect(url_for('admin_login.login_page'))
    return render_template('admin_orders.html')

# ─── ADMIN APIs ────────────────────────────────────────────────────────────────

DATE_COLUMNS = {
    "Packed":           "date_packed",
    "Shipped":          "date_shipped",
    "Out for Delivery": "date_out_for_delivery",
    "Received":         "date_delivered"
}

@admin_orders_bp.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    if not session.get("is_admin"):
        return jsonify({"error": "Unauthorized"}), 403

    try:
        conn = get_db()
        # We use the actual names from your users.db file:
        # Table is 'user' (not users)
        # Column is 'id' (not user_id)
        rows = conn.execute("""
            SELECT
                o.id            AS order_id,
                u.id            AS user_id,
                u.name          AS customer_name,
                u.email         AS customer_email,
                p.name          AS product_name,
                p.brand         AS brand,
                p.grade         AS grade,
                o.quantity,
                o.total_price,
                o.status,
                o.delivery_address,
                o.created_at
            FROM orders o
            LEFT JOIN user u    ON o.user_id    = u.id
            LEFT JOIN product p ON o.product_id = p.id
            WHERE o.status NOT IN ('pending', 'Cancelled', 'Returned')
            ORDER BY o.created_at DESC
        """).fetchall()
        conn.close()
        
        # This converts the database rows into a list your JavaScript can read
        return jsonify([dict(r) for r in rows])
        
    except Exception as e:
        # This will print the EXACT reason for the 500 error in your terminal
        print(f"[DATABASE ERROR] admin_get_orders: {e}")
        return jsonify({"error": str(e)}), 500

@admin_orders_bp.route('/api/admin/update-status/<int:order_id>', methods=['POST'])
def admin_update_status(order_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    try:
        data       = request.get_json()
        new_status = data.get('status')

        valid_statuses = ["Packed", "Shipped", "Out for Delivery", "Received"]
        if new_status not in valid_statuses:
            return jsonify({"success": False, "error": "Invalid status"}), 400

        order = Orders.query.get(order_id)
        if not order:
            return jsonify({"success": False, "error": "Order not found"}), 404

        order.status = new_status

        date_col = DATE_COLUMNS.get(new_status)
        if date_col:
            setattr(order, date_col, now())

        # Save changes
        db.session.commit()
        
        return jsonify({"success": True, "new_status": new_status})
        
    except Exception as e:
        db.session.rollback() # Rollback on error to prevent database locking
        print(f"[ERROR] admin_update_status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
