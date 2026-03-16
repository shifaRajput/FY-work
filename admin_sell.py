import sqlite3
import os
import smtplib
from email.mime.text import MIMEText
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for

admin_sell_bp = Blueprint('admin_sell_bp', __name__)

DB_PATH = "users.db"

SENDER_EMAIL    = "2mbcomputers@gmail.com"
SENDER_PASSWORD = "topb lllq rxcb zeyn"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def is_admin():
    # ✅ admin_login blueprint sets session['admin_email'] on login
    return 'admin_email' in session


def send_status_email(to_email, name, device_brand, device_model, status):
    try:
        subject = f"Update on your Sell Request: {status}"
        if status == "Approved":
            body = (
                f"Hello {name},\n\n"
                f"Great news! Your request to sell your {device_brand} {device_model} "
                f"has been APPROVED by our team.\n\n"
                f"We will contact you shortly to arrange pickup and payment.\n\n"
                f"Thank you,\n2MB Computers Team"
            )
        else:
            body = (
                f"Hello {name},\n\n"
                f"Your request to sell your {device_brand} {device_model} "
                f"has been REJECTED by our team.\n\n"
                f"Feel free to contact us or submit a new request.\n\n"
                f"Thank you,\n2MB Computers Team"
            )

        msg             = MIMEText(body)
        msg['Subject']  = subject
        msg['From']     = SENDER_EMAIL
        msg['To']       = to_email

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Email failed: {e}")


@admin_sell_bp.route("/admin/sell")
def admin_sell_page():
    return render_template("admin_sell.html")


@admin_sell_bp.route("/api/admin/requests", methods=["GET"])
def get_requests():
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT
            sr.id, sr.category, sr.brand, sr.model, sr.price,
            sr.condition, sr.description, sr.photos, sr.status, sr.created_at,
            u.user_id, u.name AS userName, u.phone, u.email
        FROM sell_requests sr
        JOIN users u ON sr.user_id = u.user_id
        ORDER BY sr.created_at DESC
    ''').fetchall()
    conn.close()

    return jsonify([{
        "id":          f"US{r['id']:03d}",
        "userId":      r['user_id'],
        "userName":    r['userName'],
        "phone":       r['phone']       or "",
        "email":       r['email']       or "",
        "category":    r['category']    or "",
        "brand":       r['brand']       or "",
        "model":       r['model']       or "",
        "price":       r['price']       or 0,
        "condition":   r['condition']   or "",
        "description": r['description'] or "No description provided.",
        "photos":      r['photos']      or "",
        "status":      r['status'],
        "createdAt":   r['created_at']
    } for r in rows])


@admin_sell_bp.route("/api/admin/update-status", methods=["POST"])
def update_status():
    data         = request.json
    formatted_id = data.get("id", "")
    status       = data.get("status", "")

    if status not in ("Approved", "Rejected"):
        return jsonify({"status": "error", "message": "Invalid status"}), 400

    try:
        numeric_id = int(formatted_id.replace("US", ""))
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid ID"}), 400

    try:
        conn    = get_db_connection()
        current = conn.execute(
            "SELECT status FROM sell_requests WHERE id = ?", (numeric_id,)
        ).fetchone()

        if not current:
            conn.close()
            return jsonify({"status": "error", "message": "Request not found"}), 404

        if current['status'] != 'Pending':
            conn.close()
            return jsonify({"status": "error", "message": "Already processed"}), 400

        conn.execute(
            "UPDATE sell_requests SET status = ? WHERE id = ?", (status, numeric_id)
        )

        user_info = conn.execute('''
            SELECT u.email, u.name, sr.brand, sr.model
            FROM sell_requests sr
            JOIN users u ON sr.user_id = u.user_id
            WHERE sr.id = ?
        ''', (numeric_id,)).fetchone()

        conn.commit()
        conn.close()

        if user_info:
            send_status_email(
                to_email=user_info['email'],
                name=user_info['name'],
                device_brand=user_info['brand'],
                device_model=user_info['model'],
                status=status
            )

        return jsonify({"status": "success"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500