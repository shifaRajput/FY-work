from flask import Blueprint, jsonify, render_template, send_from_directory, request, session
import sqlite3
import os
from datetime import datetime
from model import db, Orders

myorders_bp = Blueprint('myorders', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "users.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M")

# ─── PAGES & ASSETS ────────────────────────────────────────────────────────────

@myorders_bp.route('/myorders')
def order_page():
    return render_template('myorders.html')

@myorders_bp.route('/myorders.js')
def serve_js():
    return send_from_directory(BASE_DIR, 'myorders.js')

# ─── CUSTOMER API ──────────────────────────────────────────────────────────────

@myorders_bp.route('/api/orders')
def get_orders():
    try:
        conn = get_db()

        user_id = None
        if 'user_email' in session:
            user = conn.execute(
                "SELECT user_id FROM users WHERE email=?", (session['user_email'],)
            ).fetchone()
            user_id = user['user_id'] if user else None

        # JOIN against `product` table (id, name, brand, device_type, grade)
        sql = """
            SELECT
                o.id                    AS order_id,
                p.name                  AS product_name,
                p.brand                 AS brand,
                p.device_type           AS device_type,
                p.grade                 AS grade,
                o.total_price           AS price,
                o.quantity,
                o.status,
                o.created_at            AS date_ordered,
                o.date_packed,
                o.date_shipped,
                o.date_out_for_delivery,
                o.date_delivered,
                o.date_return_requested,
                o.delivery_address
            FROM orders o
            JOIN product p ON o.product_id = p.id
            WHERE o.status != 'pending'
            {user_filter}
            ORDER BY o.created_at DESC
        """

        if user_id:
            rows = conn.execute(
                sql.format(user_filter="AND o.user_id = ?"), (user_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                sql.format(user_filter="")
            ).fetchall()

        conn.close()
        return jsonify([dict(r) for r in rows])

    except Exception as e:
        print(f"[ERROR] get_orders: {e}")
        return jsonify([]), 500


@myorders_bp.route('/api/cancel-order/<int:order_id>', methods=['POST'])
def cancel_order(order_id):
    try:
        conn  = get_db()
        order = conn.execute("SELECT status FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            return jsonify({"success": False, "error": "Order not found"}), 404
        if order['status'] in ('Out for Delivery', 'Received', 'Return Requested', 'Returned', 'Cancelled'):
            return jsonify({"success": False, "error": "Cannot cancel at this stage"}), 400

        conn.execute("UPDATE orders SET status='Cancelled' WHERE id=?", (order_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@myorders_bp.route('/api/return-order/<int:order_id>', methods=['POST'])
def return_order(order_id):
    try:
        conn  = get_db()
        order = conn.execute("SELECT status FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            return jsonify({"success": False, "error": "Order not found"}), 404
        if order['status'] != 'Received':
            return jsonify({"success": False, "error": "Returns only allowed after delivery"}), 400

        conn.execute(
            "UPDATE orders SET status='Return Requested', date_return_requested=? WHERE id=?",
            (now(), order_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500