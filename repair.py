from flask import Blueprint, render_template, request, jsonify, send_from_directory, session, redirect
import sqlite3
import uuid
import os

repair_bp = Blueprint('repair_bp', __name__)

# --- DATABASE SETUP ---
# This forces Python to look for your ACTUAL users.db in the exact same folder as this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, 'users.db')

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create the repair_bookings table inside your existing users.db
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repair_bookings (
            booking_id TEXT PRIMARY KEY,
            user_name TEXT,
            user_email TEXT,
            user_phone TEXT,
            device_type TEXT,
            brand TEXT,
            model TEXT,
            issue_desc TEXT,
            issue_detail TEXT,
            booking_date TEXT,
            time_slot TEXT,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY(user_email) REFERENCES users(email)
        )
    ''')
    
    # Safety check: Ensure the status column exists for the Admin dashboard
    try:
        cursor.execute("ALTER TABLE repair_bookings ADD COLUMN status TEXT DEFAULT 'pending'")
    except sqlite3.OperationalError:
        pass
        
    conn.commit()
    conn.close()

init_db()


# --- ROUTES ---
@repair_bp.route('/repair')
def repair_page():
    if 'user_email' not in session:
        return redirect('/auth')
    return render_template('repair.html')

@repair_bp.route('/repair.js')
def serve_js():
    # Serves the JS file from the exact same folder as this script
    return send_from_directory('.', 'repair.js')


# --- API ENDPOINT ---
@repair_bp.route('/api/book-repair', methods=['POST'])
def book_repair():
    try:
        data = request.get_json()

        # 1. Basic Validation
        required_fields = ['userName', 'userEmail', 'userPhone', 'deviceType', 'brand', 'model', 'issueDesc', 'date', 'slot']
        for field in required_fields:
            if not data.get(field) or str(data.get(field)).strip() == "":
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Strip accidental spaces from the email
        user_email = data['userEmail'].strip()

        # 2. Open Database Connection
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # 3. VERIFY USER EXISTS (Case-insensitive check)
        cursor.execute('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', (user_email,))
        existing_user = cursor.fetchone()
        
        if not existing_user:
            conn.close()
            return jsonify({'error': f'No account found with email: {user_email}. Please sign up first!'}), 403

        # 4. Generate Booking ID and Save the Booking
        booking_id = "REP-" + str(uuid.uuid4())[:8].upper()
        
        cursor.execute('''
            INSERT INTO repair_bookings (
                booking_id, user_name, user_email, user_phone, 
                device_type, brand, model, issue_desc, 
                issue_detail, booking_date, time_slot, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ''', (
            booking_id, data['userName'], user_email, data['userPhone'],
            data['deviceType'], data['brand'], data['model'], data['issueDesc'],
            data.get('issueDetail', ''), data['date'], data['slot']
        ))
        
        conn.commit()
        conn.close()

        # 5. Return Success
        return jsonify({
            'message': 'Repair booked successfully',
            'id': booking_id
        }), 201

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({'error': 'An internal server error occurred.'}), 500

if __name__ == '__main__':
    repair_bp.run(debug=True, port=5000)
