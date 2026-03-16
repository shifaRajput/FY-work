import sqlite3
import os
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session, send_from_directory

# 1. Define the Blueprint
admin_login_bp = Blueprint('admin_login', __name__)

# Point to the Master Database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "users.db")

# --- CUSTOM JS ROUTE ---
@admin_login_bp.route('/admin_login.js')
def serve_js():
    return send_from_directory(os.getcwd(), 'admin_login.js')

# --- LOGIN ROUTES ---
@admin_login_bp.route('/login', methods=['GET'])
def login_page():
    # Standardized security check!
    if session.get('is_admin'):
        return redirect('/admin')
    return render_template('admin_login.html')

@admin_login_bp.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM admin WHERE email=? AND password=?", (username, password))
        admin_user = c.fetchone()

    if admin_user:
        session['is_admin'] = True # <--- Everyone uses this wristband now!
        return jsonify({"status": "success", "message": "Access Granted."}), 200
    else:
        return jsonify({"status": "error", "message": "Invalid Email or Password!"}), 401

@admin_login_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('admin_login.login_page'))

# --- FORGOT PASSWORD ROUTE ---
@admin_login_bp.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    pin = data.get('pin')
    new_pass = data.get('new_password')

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM admin WHERE email=? AND recovery_pin=?", (email, pin))
        if c.fetchone():
            c.execute("UPDATE admin SET password=? WHERE email=?", (new_pass, email))
            conn.commit()
            return jsonify({"status": "success", "message": "Password reset successfully!"}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid Email or Recovery PIN!"}), 400

# --- CHANGE PASSWORD ROUTE ---
@admin_login_bp.route('/api/change_password', methods=['POST'])
def change_password():
    if not session.get('is_admin'):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    old_pass = data.get('old_password')
    new_pass = data.get('new_password')

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM admin WHERE password=?", (old_pass,))
        if c.fetchone():
            c.execute("UPDATE admin SET password=?", (new_pass,))
            conn.commit()
            return jsonify({"status": "success", "message": "Password updated successfully!"}), 200
        else:
            return jsonify({"status": "error", "message": "Old password is incorrect!"}), 400