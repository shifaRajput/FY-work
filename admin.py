import os
import sqlite3
from flask import Flask, redirect, url_for
from admin_login import admin_login_bp
from admin_dashboard import admin_dashboard_bp, db
from admin_orders import admin_orders_bp
from admin_repair import admin_repair_bp
from analytics import analytics_bp
from admin_sell import admin_sell_bp  # ✅ ADDED — was missing, so /admin/sell and all its APIs didn't exist

app = Flask(__name__)
app.secret_key = os.urandom(24)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "users.db")

app.config['SQLALCHEMY_DATABASE_URI']      = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS']    = {"connect_args": {"timeout": 30}}

db.init_app(app)
with app.app_context():
    db.create_all()

def init_db():
    with sqlite3.connect(DB_PATH, timeout=30) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS admin
                     (email TEXT, password TEXT, recovery_pin TEXT)''')
        c.execute("SELECT * FROM admin")
        if not c.fetchone():
            c.execute("INSERT INTO admin VALUES ('amjadkhanpathan1980@gmail.com', 'admin1234', '12345')")
        conn.commit()

def init_db():
    with sqlite3.connect(DB_PATH, timeout=30) as conn:
        c = conn.cursor()
        # Existing admin table
        c.execute('''CREATE TABLE IF NOT EXISTS admin
                     (email TEXT, password TEXT, recovery_pin TEXT)''')
        
        # ADD THIS: Create the analytics table
        c.execute('''CREATE TABLE IF NOT EXISTS customer_growth 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      month TEXT, 
                      customer_count INTEGER)''')
        
        # ... (rest of your admin login seeding code) ...
        conn.commit()

init_db() # This runs once when the app starts        

init_db()

app.register_blueprint(admin_login_bp)
app.register_blueprint(admin_dashboard_bp)
app.register_blueprint(admin_orders_bp)
app.register_blueprint(admin_repair_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(admin_sell_bp)   # ✅ ADDED

@app.route('/')
def root():
    return redirect(url_for('admin_login.login_page'))

if __name__ == '__main__':
    app.run(debug=True, port=5001)