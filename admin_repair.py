import os
from flask import Blueprint, render_template, request, jsonify, send_from_directory, session, redirect, url_for
import sqlite3
import smtplib
from email.mime.text import MIMEText

# 1. Define the Blueprint
admin_repair_bp = Blueprint('admin_repair', __name__)

# 2. Point to users.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'users.db')

# --- EMAIL CONFIGURATION ---
SENDER_EMAIL = "2mbcomputers@gmail.com"     
SENDER_PASSWORD = "topb lllq rxcb zeyn"  

def send_status_email(to_email, user_name, device, status):
    """Sends an email to the user when admin responds."""
    subject = f"Update on your Repair Request: {status.title()}"
    
    if status == 'approved':
        body = f"Hello {user_name},\n\nGreat news! Your repair request for your {device} has been approved. Please bring your device in at your scheduled slot.\n\nThank you,\n2MB Computer"
    elif status == 'rejected':
        body = f"Hello {user_name},\n\nWe are sorry, but your repair request for your {device} has been rejected at this time. Please contact us for more details.\n\nThank you,\n2MB Computer"
    elif status == 'contacted':
        subject = "Action Required: Your Repair Request"
        body = f"Hello {user_name},\n\nWe are currently reviewing your repair request for your {device}. However, we need a few more details to proceed.\n\nCould you please reply to this email with more information, or suggest a time to visit our store personally so we can physically inspect the device?\n\nThank you,\n2MB Computer"

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"✅ SUCCESS: Email sent to {to_email}")
    except Exception as e:
        print(f"❌ FAILED to send email: {e}")

# --- CUSTOM JS ROUTE ---
@admin_repair_bp.route('/admin_repair.js')
def serve_admin_js():
    return send_from_directory(os.getcwd(), 'admin_repair.js')

# --- PAGE ROUTE ---
@admin_repair_bp.route('/admin/repairs')
def admin_page():
    # Security Bouncer!
    if not session.get("is_admin"): return redirect(url_for('admin_login.login_page'))
    return render_template('repair_admin.html')

# --- API ROUTES ---
@admin_repair_bp.route('/api/repairs', methods=['GET'])
def get_all_repairs():
    if not session.get("is_admin"): return jsonify({"error": "Unauthorized"}), 403
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM repair_bookings ORDER BY booking_date DESC')
    rows = cursor.fetchall()
    conn.close()
    
    repairs = []
    for row in rows:
        repairs.append({
            'booking_id': row[0], # Fixed to match your DB!
            'name': row[1],
            'email': row[2],
            'phone': row[3],
            'device': row[4],
            'issue': row[7],
            'date': row[9],
            'slot': row[10],
            'status': row[11]
        })
        
    return jsonify(repairs)

@admin_repair_bp.route('/api/update-status/<booking_id>', methods=['POST'])
def update_status(booking_id):
    if not session.get("is_admin"): return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    new_status = data.get('status')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('UPDATE repair_bookings SET status = ? WHERE booking_id = ?', (new_status, booking_id))
    cursor.execute('SELECT user_name, user_email, device_type FROM repair_bookings WHERE booking_id = ?', (booking_id,))
    booking = cursor.fetchone()
    
    conn.commit()
    conn.close()
    
    if booking:
        user_name, user_email, device_type = booking
        # Note: This will actually send the email when you test it!
        send_status_email(user_email, user_name, device_type, new_status)
        return jsonify({'message': 'Status updated and email sent!'}), 200
    else:
        return jsonify({'error': 'Booking not found'}), 404