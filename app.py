from model import db, Product, User
from flask import Flask, render_template, request, redirect, url_for, session 
from flask import request
import os 
from functools import wraps
from flask import jsonify
from sqlalchemy import or_
from flask import send_from_directory

#import blueprint
from Login_SignUp import auth_bp 
from sell import sell_bp
from repair import repair_bp 
from myorders import myorders_bp
from wishlist import wishlist_bp
from cart import cart_bp
from payment import payment_bp

app = Flask(__name__)   # ✅ Only ONE Flask() instance

# -------------------------
# Configuration
# -------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.secret_key = os.environ.get("SECRET_KEY", "MB_computer_secret_key")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'static', 'uploads')

if not os.path.isdir(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize Database
db.init_app(app)

with app.app_context():        
    db.create_all()

# Initialize Wishlist Database
from wishlist import init_db
init_db()

# Register the Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(sell_bp)
app.register_blueprint(repair_bp)
app.register_blueprint(myorders_bp, name="myorders")
app.register_blueprint(wishlist_bp)
app.register_blueprint(cart_bp, url_prefix='/cart_api')
app.register_blueprint(payment_bp)

# Decorator to protect routes
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_email' not in session:
            return redirect(url_for('auth.auth_page'))
        return f(*args, **kwargs)
    return decorated_function

# Home Route
@app.route('/')
def home():
    products = Product.query.all()
    show_tour = session.get('show_onboarding', False)
    if show_tour:
        session.pop('show_onboarding', None)
    # Fetch wishlist IDs server-side so Jinja pre-renders filled hearts
    wishlist_ids = []
    try:
        import sqlite3 as _sql
        _conn = _sql.connect(os.path.join(BASE_DIR, 'users.db'))
        _cur  = _conn.cursor()
        _uid  = session.get('user_id')
        _sid  = session.get('wishlist_session_id')
        if _uid and _sid:
            _cur.execute('SELECT product_id FROM wishlist_items WHERE user_id=? OR session_id=?', (_uid, _sid))
        elif _uid:
            _cur.execute('SELECT product_id FROM wishlist_items WHERE user_id=?', (_uid,))
        elif _sid:
            _cur.execute('SELECT product_id FROM wishlist_items WHERE session_id=?', (_sid,))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
        _conn.close()
    except Exception:
        wishlist_ids = []
    return render_template("home.html", products=products, show_tour=show_tour, wishlist_ids=wishlist_ids)

@app.route('/profile')
@login_required
def profile():
    user = User.query.get(session['user_id'])
    return render_template('profile.html', user=user)

@app.route('/cart')
@login_required
def cart():
    return render_template('cart.html')

@app.route('/wishlist')
@login_required
def wishlist():
    return render_template('wishlist.html')

@app.route('/about_us')
def about_us():
    return render_template('about_us.html')

@app.route('/privay')
def privay():
    return render_template('privay.html')

@app.route('/terms&condition')
def terms():
    return render_template('terms&condition.html')

@app.route('/refund')
def refund():
    return render_template('refund.html')

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    wishlist_ids = []
    if 'user_id' in session:
        _cur = db.session.execute(db.text(f"SELECT product_id FROM wishlist_items WHERE user_id = {session['user_id']}"))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
    return render_template("detail.html", product=product, wishlist_ids=wishlist_ids)

@app.route('/laptops')
def laptops():
    products = Product.query.filter_by(device_type="laptop").all()
    brands = (
        db.session.query(Product.brand)
        .filter_by(device_type="laptop")
        .distinct()
        .all()
    )
    brands = [b[0] for b in brands if b[0]]
    wishlist_ids = []
    if 'user_id' in session:
        _cur = db.session.execute(db.text(f"SELECT product_id FROM wishlist_items WHERE user_id = {session['user_id']}"))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
    return render_template("laptop.html", products=products, brands=brands, wishlist_ids=wishlist_ids)

@app.route('/smartphones')
def smartphones():
    products = Product.query.filter_by(device_type="smartphone").all()
    brands = (
        db.session.query(Product.brand)
        .filter_by(device_type="smartphone")
        .distinct()
        .all()
    )
    brands = [b[0] for b in brands if b[0]]
    wishlist_ids = []
    if 'user_id' in session:
        _cur = db.session.execute(db.text(f"SELECT product_id FROM wishlist_items WHERE user_id = {session['user_id']}"))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
    return render_template("smartphone.html", products=products, brands=brands, wishlist_ids=wishlist_ids)

@app.route('/computers')
def computers():
    products = Product.query.filter_by(device_type="computer").all()
    brands = (
        db.session.query(Product.brand)
        .filter_by(device_type="computer")
        .distinct()
        .all()
    )
    brands = [b[0] for b in brands if b[0]]
    wishlist_ids = []
    if 'user_id' in session:
        _cur = db.session.execute(db.text(f"SELECT product_id FROM wishlist_items WHERE user_id = {session['user_id']}"))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
    return render_template("computer.html", products=products, brands=brands, wishlist_ids=wishlist_ids)

@app.route('/discount')
def discount():
    products = Product.query.filter_by(discount=True).all()
    brands = (
        db.session.query(Product.brand)
        .filter_by(discount=True)
        .distinct()
        .all()
    )
    brands = [b[0] for b in brands if b[0]]
    wishlist_ids = []
    if 'user_id' in session:
        _cur = db.session.execute(db.text(f"SELECT product_id FROM wishlist_items WHERE user_id = {session['user_id']}"))
        wishlist_ids = [row[0] for row in _cur.fetchall()]
    return render_template("discount.html", products=products, brands=brands, wishlist_ids=wishlist_ids)

@app.route("/search")
def search():
    query = request.args.get("q", "")
    products = Product.query.filter(
        or_(
            Product.name.ilike(f"%{query}%"),
            Product.brand.ilike(f"%{query}%")
        )
    ).all()
    return render_template("home.html", products=products, show_tour=False)

@app.route("/api/search")
def api_search():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])
    products = Product.query.filter(
        or_(
            Product.name.ilike(f"%{query}%"),
            Product.brand.ilike(f"%{query}%")
        )
    ).limit(5).all()
    results = []
    for p in products:
        results.append({
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "price": p.real_price,
            "stock": p.stock,
            "image": p.media[0].filename if p.media else None
        })
    return jsonify(results)

# ✅ Help route added here (with all other routes, NOT after a second app = Flask())
@app.route('/help')
def help_page():
    return render_template('help.html')

@app.route('/<path:filename>')
def serve_js(filename):
    if filename.endswith('.js'):
        return send_from_directory(BASE_DIR, filename)
    return "Not found", 404

# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)
