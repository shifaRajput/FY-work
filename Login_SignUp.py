from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
import sqlite3
import smtplib
from email.mime.text import MIMEText
import os

# Initialize as a Blueprint
auth_bp = Blueprint('auth', __name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def get_db():
    return sqlite3.connect(DB_PATH, timeout=10)

@auth_bp.route('/auth')
def auth_page():
    # If already logged in, go straight to profile
    if 'user_email' in session:
        return redirect(url_for('auth.profile'))
    return render_template("Login_SignUp.html")

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.form
    name, email, password = data.get("name"), data.get("email"), data.get("password")
    
    if not (name and email and password):
        return jsonify({"success": False, "message": "All fields are required"})

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=?", (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Email already registered!"})

    c.execute("INSERT INTO users (name,email,password) VALUES (?,?,?)", (name,email,password))
    user_id= c.lastrowid
    conn.commit()
    conn.close()

    session['user_id'] = user_id
    session['user_email'] = email
    session['name'] = name
    session['show_onboarding'] = True 

    try:
        send_email(email, "Welcome!", "Thank you for choosing refurbished electronic continue your shopping") 
    except Exception as e:
        print("Email error:", e)

    return jsonify({"success": True, "message": "Account created successfully!", "name": name, "redirect": url_for('home')})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.form
    email, password = data.get("email"), data.get("password")

    conn = get_db()
    c = conn.cursor()
    # Add 'user_id' to your SELECT statement
    c.execute("SELECT user_id, name, email, address, phone FROM users WHERE email=? AND password=?", (email,password))
    user = c.fetchone()
    conn.close()

    if user:
        # Store user_id in session so cart.py and other parts can find it
        session['user_id'] = user[0] 
        session['user_email'] = user[2]
        session['name'] = user[1]
        
        return jsonify({
            "success": True, 
            "name": user[1], 
            "email": user[2],
            "address": user[3] if user[3] else "",
            "phone": user[4] if user[4] else ""
        })
    else:
        return jsonify({"success": False, "message": "Invalid email or password"})
    
@auth_bp.route('/profile')
def profile():
    if 'user_email' not in session:
        return redirect(url_for('auth.auth_page'))
    
    email = session['user_email']
    conn = get_db()
    c = conn.cursor()
    # Fetch user data to display on the profile card
    c.execute("SELECT name, email, address, phone FROM users WHERE email=?", (email,))
    user = c.fetchone()
    conn.close()

    if user is None:
        session.clear() # Clear invalid session
        return redirect(url_for('auth.auth_page'))

    return render_template("Login_SignUp.html", user_data={
        "name": user[0],
        "email": user[1],
        "address": user[2] if user[2] else "",
        "phone": user[3] if user[3] else ""
    })    

@auth_bp.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user_email' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    field = data.get('field') 
    value = data.get('value')
    email = session['user_email']
    
    conn = get_db()
    c = conn.cursor()
    query = f"UPDATE users SET {field}=? WHERE email=?"
    c.execute(query, (value, email))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True})

@auth_bp.route('/forgot', methods=['POST'])
def forgot():
    email = request.form.get("email")
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT password, name FROM users WHERE email=?", (email,))
    user = c.fetchone()
    conn.close()

    if user:
        try:
            send_email(email, "Password Recovery", f"Hi {user[1]}, your password is: {user[0]}")
            return jsonify({"success": True, "message": "Password sent to your email"})
        except Exception as e:
            return jsonify({"success": False, "message": "Email error"})
    return jsonify({"success": False, "message": "Email not found"})

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.auth_page')) # Redirects back to the login page

def send_email(to_email, subject, body):
    sender_email = "2mbcomputers@gmail.com"
    sender_password = "topb lllq rxcb zeyn" 
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sender_email, sender_password)
    server.send_message(msg)
    server.quit()