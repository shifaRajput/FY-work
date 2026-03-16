from model import db, Cart
from flask import Blueprint, request, jsonify, session
from functools import wraps
import sqlite3
import os

cart_bp = Blueprint('cart_bp', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CART_DB = os.path.join(BASE_DIR, "users.db")

def get_db_connection():
    conn = sqlite3.connect(CART_DB)
    conn.row_factory = sqlite3.Row
    return conn

# ----------------------
# HELPER: GET USER ID FROM EMAIL
# ----------------------
def get_current_user_id():
    """Fetches the user_id securely using the logged-in email"""
    email = session.get('user_email')
    if not email:
        return None
        
    conn = get_db_connection()
    cursor = conn.cursor()
    # Querying the 'users' table
    cursor.execute("SELECT user_id as id FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    return row['id'] if row else None

# ----------------------
# LOGIN REQUIRED DECORATOR
# ----------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Now accurately checking for 'user_email' to match your app.py
        if 'user_email' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# ----------------------
# ADD PRODUCT TO CART
# ----------------------
@cart_bp.route("/add", methods=["POST"])
@login_required
def add_product():
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({"error": "User account not found"}), 401

        product_id = data.get("product_id")
        quantity = data.get("quantity", 1)

        if not product_id:
            return jsonify({"error": "Missing product ID"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the product is already in the user's cart
        cursor.execute("SELECT quantity FROM cart WHERE user_id=? AND product_id=?", (user_id, product_id))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("UPDATE cart SET quantity = quantity + ? WHERE user_id=? AND product_id=?",
                           (quantity, user_id, product_id))
        else:
            cursor.execute("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)",
                           (user_id, product_id, quantity))
        
        conn.commit()

        # Get updated total cart count for the badge
        cursor.execute("SELECT SUM(quantity) FROM cart WHERE user_id=?", (user_id,))
        count_row = cursor.fetchone()
        cart_count = count_row[0] if count_row[0] else 0

        conn.close()
        return jsonify({"message": "Product added to cart", "cart_count": cart_count}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------
# GET CART PRODUCTS
# ----------------------
@cart_bp.route("/get", methods=["GET"])
@login_required
def get_products():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User account not found"}), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        # Join cart with product and media tables to get live details
        query = """
            SELECT 
                c.id as cart_id, 
                c.product_id, 
                c.quantity, 
                p.name, 
                p.real_price as price,
                (SELECT filename FROM media WHERE product_id = p.id LIMIT 1) as image
            FROM cart c
            JOIN product p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.id DESC
        """
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()
        conn.close()

        products = []
        total_price = 0

        for row in rows:
            price = float(row["price"]) if row["price"] else 0
            quantity = int(row["quantity"])
            item_total = price * quantity
            total_price += item_total

            products.append({
                "id": row["cart_id"],
                "product_id": row["product_id"],
                "name": row["name"],
                "price": price,
                "image": row["image"],
                "quantity": quantity,
                "item_total": item_total
            })

        return jsonify({
            "items": products,
            "total": total_price,
            "count": sum(item["quantity"] for item in products)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------
# GET CART COUNT (for badge)
# ----------------------
@cart_bp.route("/count", methods=["GET"])
def get_cart_count():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"count": 0}), 200

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT SUM(quantity) FROM cart WHERE user_id=?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        count = row[0] if row[0] else 0
        return jsonify({"count": count}), 200

    except Exception as e:
        return jsonify({"count": 0}), 200

# ----------------------
# UPDATE CART QUANTITY
# ----------------------
@cart_bp.route("/update/<int:product_id>", methods=["PUT"])
@login_required
def update_quantity(product_id):
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User account not found"}), 401

        data = request.get_json()
        quantity = data.get("quantity", 1)

        if quantity < 1:
            return jsonify({"error": "Quantity must be at least 1"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE cart SET quantity = ? WHERE user_id=? AND product_id=?",
                       (quantity, user_id, product_id))
        conn.commit()
        conn.close()

        return jsonify({"message": "Quantity updated"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------
# DELETE PRODUCT FROM CART
# ----------------------
@cart_bp.route("/delete/<int:product_id>", methods=["DELETE"])
@login_required
def delete_product(product_id):
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User account not found"}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart WHERE user_id=? AND product_id=?",
                       (user_id, product_id))
        conn.commit()
        conn.close()

        return jsonify({"message": "Product removed"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------
# CLEAR ENTIRE CART
# ----------------------
@cart_bp.route("/clear", methods=["DELETE"])
@login_required
def clear_cart():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User account not found"}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart WHERE user_id=?", (user_id,))
        conn.commit()
        conn.close()

        return jsonify({"message": "Cart cleared"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500