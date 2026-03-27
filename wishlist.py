from flask import Blueprint, request, jsonify, render_template, session
from typing import TypedDict, List
from model import db, Product
from datetime import datetime
import sqlite3
import os
from functools import wraps
from flask import redirect, url_for 

# =====================
# TYPE DEFINITIONS
# =====================
class ProductDict(TypedDict):
    """Represents a Product"""
    id: int
    name: str
    brand: str
    real_price: float
    old_price: float
    device_type: str
    grade: str
    discount: bool
    tagline: str
    image_url: str

class WishlistItemDict(TypedDict):
    """Represents a Wishlist Item"""
    product_id: int
    name: str
    brand: str
    real_price: float
    image_url: str
    added_at: str

# =====================
# DATABASE SETUP
# =====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "users.db")  # Use users.db instead of wishlist.db

def init_db():
    """Initialize database and create tables if they don't exist"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='wishlist_items'
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            # Check if the table has all required columns
            cursor.execute("PRAGMA table_info(wishlist_items)")
            existing_columns = {row[1] for row in cursor.fetchall()}
            required_columns = {
                'wishlist_id', 'user_id', 'session_id', 'product_id', 'quantity',
                'variant_size', 'variant_color', 'variant_spec', 'name', 'brand',
                'device_type', 'grade', 'real_price', 'old_price', 'discount',
                'stock', 'tagline', 'image_url', 'created_date_time'
            }
            
            # If columns are missing, drop and recreate
            if not required_columns.issubset(existing_columns):
                print("DEBUG: Old table structure detected. Recreating with new schema...")
                cursor.execute("DROP TABLE IF EXISTS wishlist_items")
                table_exists = False
        
        # Create table if it doesn't exist
        if not table_exists:
            cursor.execute("""
                CREATE TABLE wishlist_items (
                    wishlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    session_id TEXT,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    variant_size TEXT,
                    variant_color TEXT,
                    variant_spec TEXT,
                    name TEXT NOT NULL,
                    brand TEXT,
                    device_type TEXT,
                    grade TEXT,
                    real_price REAL NOT NULL,
                    old_price REAL,
                    discount BOOLEAN DEFAULT 0,
                    stock INTEGER,
                    tagline TEXT,
                    image_url TEXT,
                    created_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(product_id, session_id)
                )
            """)
            print("DEBUG: Created new wishlist_items table in users.db")
        
        conn.commit()
        conn.close()
        print("DEBUG: Wishlist database initialized successfully")
    except Exception as e:
        print(f"ERROR initializing wishlist database: {str(e)}")
        raise

def get_user_id() -> int:
    """Get user ID from session, or return None if not authenticated"""
    return session.get('user_id')

def get_session_id() -> str:
    """Get or create a session ID and store it in Flask session"""
    if 'wishlist_session_id' not in session:
        import uuid
        new_id = str(uuid.uuid4())
        session['wishlist_session_id'] = new_id
        session.permanent = True  # Make session persistent
        print(f"DEBUG: Created new session ID: {new_id}")
    else:
        print(f"DEBUG: Using existing session ID: {session['wishlist_session_id']}")
    return session['wishlist_session_id']

def get_db_wishlist() -> List[WishlistItemDict]:
    """Get wishlist items from database for current session"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    try:
        # If user is logged in, prioritize user_id. Otherwise use session_id
        if user_id:
            print(f"DEBUG: Fetching wishlist for user_id={user_id}")
            cursor.execute("""
                SELECT wishlist_id, product_id, user_id, quantity, variant_size, 
                       variant_color, variant_spec, name, brand, device_type, grade, 
                       real_price, old_price, discount, stock, tagline, image_url, 
                       created_date_time 
                FROM wishlist_items 
                WHERE user_id = ? 
                ORDER BY created_date_time DESC
            """, (user_id,))
        else:
            print(f"DEBUG: Fetching wishlist for session_id={session_id}")
            cursor.execute("""
                SELECT wishlist_id, product_id, user_id, quantity, variant_size, 
                       variant_color, variant_spec, name, brand, device_type, grade, 
                       real_price, old_price, discount, stock, tagline, image_url, 
                       created_date_time 
                FROM wishlist_items 
                WHERE session_id = ? 
                ORDER BY created_date_time DESC
            """, (session_id,))
        
        rows = cursor.fetchall()
        result = [dict(row) for row in rows]
        print(f"DEBUG: get_db_wishlist - Found {len(result)} items")
        if result:
            print(f"DEBUG: First item keys: {list(result[0].keys())}")
            print(f"DEBUG: First item: {result[0]}")
        return result
    except Exception as e:
        print(f"ERROR in get_db_wishlist: {str(e)}")
        return []
    finally:
        conn.close()

def add_to_db_wishlist(product_id: int, name: str, brand: str, device_type: str, 
                       grade: str, real_price: float, old_price: float, discount: bool, 
                       stock: int, tagline: str, image_url: str, quantity: int = 1,
                       variant_size: str = None, variant_color: str = None, 
                       variant_spec: str = None):
    """Add item to wishlist database with variant information"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    print(f"DEBUG: Adding to wishlist - product_id={product_id}, name={name}, quantity={quantity}, user_id={user_id}, session={session_id}")
    
    # Check if already exists - prioritize user_id if logged in
    if user_id:
        cursor.execute("""
            SELECT wishlist_id FROM wishlist_items 
            WHERE product_id = ? AND user_id = ?
        """, (product_id, user_id))
    else:
        cursor.execute("""
            SELECT wishlist_id FROM wishlist_items 
            WHERE product_id = ? AND session_id = ?
        """, (product_id, session_id))
    
    if cursor.fetchone():
        print(f"DEBUG: Product {product_id} already in wishlist")
        conn.close()
        return False
    
    try:
        cursor.execute("""
            INSERT INTO wishlist_items 
            (product_id, user_id, session_id, quantity, variant_size, variant_color, variant_spec,
             name, brand, device_type, grade, real_price, old_price, discount, stock, tagline, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (product_id, user_id, session_id, quantity, variant_size, variant_color, variant_spec,
              name, brand, device_type, grade, real_price, old_price, discount, stock, tagline, image_url))
        
        conn.commit()
        print(f"DEBUG: Successfully inserted product {product_id} into wishlist")
        conn.close()
        return True
    except Exception as e:
        print(f"ERROR inserting into wishlist: {str(e)}")
        conn.close()
        return False

def remove_from_db_wishlist(product_id: int):
    """Remove item from wishlist database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    if user_id:
        cursor.execute("""
            DELETE FROM wishlist_items 
            WHERE product_id = ? AND user_id = ?
        """, (product_id, user_id))
    else:
        cursor.execute("""
            DELETE FROM wishlist_items 
            WHERE product_id = ? AND session_id = ?
        """, (product_id, session_id))
    
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    
    return deleted > 0

def update_wishlist_quantity(product_id: int, quantity: int):
    """Update quantity of item in wishlist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    if quantity <= 0:
        # Remove item if quantity is 0 or less
        return remove_from_db_wishlist(product_id)
    
    try:
        if user_id:
            cursor.execute("""
                UPDATE wishlist_items 
                SET quantity = ? 
                WHERE product_id = ? AND user_id = ?
            """, (quantity, product_id, user_id))
        else:
            cursor.execute("""
                UPDATE wishlist_items 
                SET quantity = ? 
                WHERE product_id = ? AND session_id = ?
            """, (quantity, product_id, session_id))
        
        updated = cursor.rowcount
        conn.commit()
        conn.close()
        return updated > 0
    except Exception as e:
        print(f"ERROR updating quantity: {str(e)}")
        conn.close()
        return False

def update_wishlist_variants(product_id: int, variant_size: str = None, 
                            variant_color: str = None, variant_spec: str = None):
    """Update variant information for item in wishlist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    try:
        if user_id:
            cursor.execute("""
                UPDATE wishlist_items 
                SET variant_size = ?, variant_color = ?, variant_spec = ?
                WHERE product_id = ? AND user_id = ?
            """, (variant_size, variant_color, variant_spec, product_id, user_id))
        else:
            cursor.execute("""
                UPDATE wishlist_items 
                SET variant_size = ?, variant_color = ?, variant_spec = ?
                WHERE product_id = ? AND session_id = ?
            """, (variant_size, variant_color, variant_spec, product_id, session_id))
        
        updated = cursor.rowcount
        conn.commit()
        conn.close()
        return updated > 0
    except Exception as e:
        print(f"ERROR updating variants: {str(e)}")
        conn.close()
        return False

def clear_db_wishlist():
    """Clear entire wishlist for current session"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    session_id = get_session_id()
    user_id = get_user_id()
    
    if user_id:
        cursor.execute("""
            DELETE FROM wishlist_items 
            WHERE user_id = ?
        """, (user_id,))
    else:
        cursor.execute("""
            DELETE FROM wishlist_items 
            WHERE session_id = ?
        """, (session_id,))
    
    conn.commit()
    conn.close()

# Initialize DB on module load
init_db()

wishlist_bp = Blueprint('wishlist_bp', __name__)

# =====================
# ROUTES
# =====================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_email' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function
    


@wishlist_bp.route('/wishlist')
def wishlist_page():
    if 'user_email' not in session:
        return redirect('/auth') 
    return render_template('wishlist.html')

@wishlist_bp.route("/api/products/all", methods=["GET"])
def getAllProducts():
    """Get all products from database"""
    try:
        products = Product.query.all()
        product_list = []
        
        for product in products:
            # Get first image from media
            image_url = None
            if product.media and len(product.media) > 0:
                image_url = f'/static/uploads/{product.media[0].filename}'
            
            product_list.append({
                'id': product.id,
                'name': product.name,
                'brand': product.brand or 'Unknown',
                'real_price': product.real_price,
                'old_price': product.old_price,
                'device_type': product.device_type,
                'grade': product.grade,
                'discount': product.discount,
                'tagline': product.tagline,
                'image_url': image_url or '/static/images/placeholder.jpg'
            })
        
        return jsonify({
            'success': True,
            'products': product_list,
            'count': len(product_list)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/add", methods=["POST"])
@login_required
def addToWishlist():
    """Add product to wishlist for current session"""
    try:
        session.permanent = True  # Make session persistent
        session.modified = True  # Force save session
        data = request.json
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        variant_size = data.get('variant_size')
        variant_color = data.get('variant_color')
        variant_spec = data.get('variant_spec')
        
        if not product_id:
            return jsonify({'success': False, 'error': 'product_id required'}), 400
        
        # Fetch product from database
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        # Get image URL
        image_url = '/static/images/placeholder.jpg'
        if product.media and len(product.media) > 0:
            image_url = f'/static/uploads/{product.media[0].filename}'
        
        # Add to database with all product details and variant information
        added = add_to_db_wishlist(
            product_id=product.id,
            name=product.name,
            brand=product.brand or 'Unknown',
            device_type=product.device_type,
            grade=product.grade,
            real_price=product.real_price,
            old_price=product.old_price,
            discount=product.discount,
            stock=product.stock,
            tagline=product.tagline,
            image_url=image_url,
            quantity=quantity,
            variant_size=variant_size,
            variant_color=variant_color,
            variant_spec=variant_spec
        )
        
        if not added:
            return jsonify({'success': False, 'error': 'Already in wishlist'}), 400
        
        # Create item for response with all new fields
        item = {
            'product_id': product.id,
            'name': product.name,
            'brand': product.brand or 'Unknown',
            'device_type': product.device_type,
            'grade': product.grade,
            'real_price': product.real_price,
            'old_price': product.old_price,
            'discount': product.discount,
            'stock': product.stock,
            'tagline': product.tagline,
            'image_url': image_url,
            'quantity': quantity,
            'variant_size': variant_size,
            'variant_color': variant_color,
            'variant_spec': variant_spec,
            'created_date_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'user_id': get_user_id()
        }
        
        return jsonify({
            'success': True,
            'message': 'Product added to wishlist',
            'item': item
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/remove", methods=["DELETE"])
@login_required
def removeFromWishlist():
    """Remove product from user's wishlist"""
    try:
        session.permanent = True  # Make session persistent
        session.modified = True  # Force save session
        data = request.json
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'success': False, 'error': 'product_id required'}), 400
        
        # Remove from database
        removed = remove_from_db_wishlist(product_id)
        
        if not removed:
            return jsonify({'success': False, 'error': 'Item not found in wishlist'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Product removed from wishlist'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/get", methods=["GET"])
def getWishlist():
    """Get all items in user's wishlist"""
    try:
        session.permanent = True  # Make session persistent
        session.modified = True  # Force save session
        print(f"DEBUG: getWishlist called")
        wishlist = get_db_wishlist()
        print(f"DEBUG: Returning {len(wishlist)} items")
        return jsonify({
            'success': True,
            'wishlist': wishlist,
            'count': len(wishlist)
        }), 200
    except Exception as e:
        print(f"ERROR in getWishlist: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/clear", methods=["DELETE"])
def clearWishlist():
    """Clear entire wishlist for current session"""
    try:
        session.permanent = True  # Make session persistent
        session.modified = True  # Force save session
        clear_db_wishlist()
        return jsonify({
            'success': True,
            'message': 'Wishlist cleared'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/update-quantity", methods=["PUT"])
def updateWishlistQuantity():
    """Update quantity of item in wishlist"""
    try:
        session.permanent = True
        session.modified = True
        data = request.json
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return jsonify({'success': False, 'error': 'product_id required'}), 400
        
        updated = update_wishlist_quantity(product_id, quantity)
        
        if not updated:
            return jsonify({'success': False, 'error': 'Item not found in wishlist'}), 404
        
        return jsonify({
            'success': True,
            'message': f'Quantity updated to {quantity}',
            'product_id': product_id,
            'quantity': quantity
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/update-variants", methods=["PUT"])
def updateWishlistVariants():
    """Update variant information for item in wishlist"""
    try:
        session.permanent = True
        session.modified = True
        data = request.json
        product_id = data.get('product_id')
        variant_size = data.get('variant_size')
        variant_color = data.get('variant_color')
        variant_spec = data.get('variant_spec')
        
        if not product_id:
            return jsonify({'success': False, 'error': 'product_id required'}), 400
        
        updated = update_wishlist_variants(product_id, variant_size, variant_color, variant_spec)
        
        if not updated:
            return jsonify({'success': False, 'error': 'Item not found in wishlist'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Variant information updated',
            'product_id': product_id,
            'variant_size': variant_size,
            'variant_color': variant_color,
            'variant_spec': variant_spec
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@wishlist_bp.route("/api/wishlist/debug", methods=["GET"])
def debugWishlist():
    """Debug endpoint to check raw database content and session"""
    try:
        session.permanent = True  # Make session persistent
        session.modified = True  # Force save session
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        all_tables = [row[0] for row in cursor.fetchall()]
        
        debug_info = {
            'database_path': DB_PATH,
            'tables': all_tables
        }
        
        # If wishlist_items table exists, get column info
        if 'wishlist_items' in all_tables:
            cursor.execute("PRAGMA table_info(wishlist_items)")
            columns = [{'name': row[1], 'type': row[2]} for row in cursor.fetchall()]
            debug_info['wishlist_columns'] = columns
            
            # Get all items
            cursor.execute("SELECT * FROM wishlist_items")
            all_rows = cursor.fetchall()
            all_items = [dict(row) for row in all_rows]
            
            session_id = get_session_id()
            user_id = get_user_id()
            
            # Get items by session_id
            cursor.execute("SELECT * FROM wishlist_items WHERE session_id = ?", (session_id,))
            session_rows = cursor.fetchall()
            session_items = [dict(row) for row in session_rows]
            
            # Get items by user_id (if logged in)
            user_items = []
            if user_id:
                cursor.execute("SELECT * FROM wishlist_items WHERE user_id = ?", (user_id,))
                user_rows = cursor.fetchall()
                user_items = [dict(row) for row in user_rows]
            
            debug_info['current_session_id'] = session_id
            debug_info['current_user_id'] = user_id
            debug_info['all_items_count'] = len(all_items)
            debug_info['all_items'] = all_items
            debug_info['session_items_count'] = len(session_items)
            debug_info['session_items'] = session_items
            debug_info['user_items_count'] = len(user_items)
            debug_info['user_items'] = user_items
        else:
            debug_info['warning'] = 'wishlist_items table not found!'
        
        conn.close()
        
        return jsonify({
            'success': True,
            'debug': debug_info
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500    
