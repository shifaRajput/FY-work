import os
import sqlite3
from flask import Blueprint, render_template, jsonify, session, redirect, url_for 

# Define the Blueprint
analytics_bp = Blueprint('analytics', __name__)

# Base path for users.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "users.db")

def get_db_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

@analytics_bp.route('/admin/analytics')
def analytics_page():
    if not session.get("is_admin"):
        return redirect(url_for('admin_login.login_page'))

    conn = get_db_conn() 
    
    # --- REAL DATABASE METRICS ---
    total_customers = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] or 0
    total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0] or 0 [cite: 11]
    total_repairs = conn.execute("SELECT COUNT(*) FROM repair_bookings").fetchone()[0] or 0 [cite: 8]
    total_sells = conn.execute("SELECT COUNT(*) FROM sell_requests").fetchone()[0] or 0 [cite: 7]
    
    # Revenue Calculation
    rev_row = conn.execute("SELECT SUM(total_price) FROM orders WHERE status != 'Cancelled'").fetchone() [cite: 11]
    total_revenue = round(rev_row[0] or 0, 2)
    
    # Conversion & Bounce (Simulated based on real activity)
    active_buyers = conn.execute("SELECT COUNT(DISTINCT user_id) FROM orders").fetchone()[0] or 0 [cite: 11]
    conversion_rate = round((active_buyers / total_customers * 100) if total_customers > 0 else 0, 1)
    bounce_rate = 25.4 # You can keep this static or calculate from a logs table
    
    # --- GROWTH DATA (Months for X-Axis, Nos for Y-Axis) ---
    growth_data = conn.execute("SELECT month, customer_count FROM customer_growth ORDER BY id ASC").fetchall() [cite: 5]
    if not growth_data:
        # Seed default months if table is empty
        months = [('Oct', 10), ('Nov', 25), ('Dec', 45), ('Jan', 60), ('Feb', 85), ('Mar', total_customers)]
        for m, c in months:
            conn.execute("INSERT INTO customer_growth (month, customer_count) VALUES (?, ?)", (m, c))
        conn.commit()
        growth_data = conn.execute("SELECT month, customer_count FROM customer_growth ORDER BY id ASC").fetchall()

    conn.close()
    
    return render_template('analytics.html', 
                           total_customers=total_customers,
                           total_revenue=total_revenue,
                           conversion_rate=conversion_rate,
                           bounce_rate=bounce_rate,
                           total_orders=total_orders,
                           total_repairs=total_repairs,
                           total_sells=total_sells,
                           growth_labels=[r['month'] for r in growth_data],
                           growth_values=[r['customer_count'] for r in growth_data])                               

@analytics_bp.route('/api/analytics-data')
def get_analytics_data():
    if not session.get("is_admin"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db_conn()
    growth_data = conn.execute("SELECT * FROM customer_growth ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify({
        "labels": [r['month'] for r in growth_data],
        "customers": [r['customer_count'] for r in growth_data]
    })