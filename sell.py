import os
from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, session
from model import db, User, SellRequest

sell_bp = Blueprint('sell_bp', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads", "sell_photos")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@sell_bp.route("/sell")
def sell_page():
    user_data = None
    if 'user_email' in session:
        user = User.query.filter_by(email=session['user_email']).first()
        if user:
            user_data = {
                "name":  user.name or "",
                "email": user.email or "",
                "phone": user.phone or "",
            }
    return render_template("sell.html", user_data=user_data)


@sell_bp.route("/api/get-user-by-email", methods=["POST"])
def get_user_by_email():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"status": "error", "message": "No email provided"})

    user = User.query.filter_by(email=email).first()

    if user:
        return jsonify({
            "status":  "success",
            "user_id": user.user_id,
            "name":    user.name or "",
            "phone":   user.phone or "",
        })
    return jsonify({"status": "error", "message": "User not found"})


@sell_bp.route("/api/sell-device", methods=["POST"])
def sell_device():
    email = request.form.get("userEmail", "").strip()
    if not email:
        return jsonify({"status": "error", "message": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"status": "error", "message": "Email not found. Please register first."}), 400

    files = [f for f in request.files.getlist("photos") if f and f.filename]

    if len(files) < 1:
        return jsonify({"status": "error", "message": "Please upload at least 1 photo."}), 400
    if len(files) > 5:
        return jsonify({"status": "error", "message": "Maximum 5 photos allowed."}), 400

    photo_paths = []
    for file in files:
        if not allowed_file(file.filename):
            return jsonify({"status": "error", "message": f"Invalid file type: {file.filename}"}), 400

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        safe_name = file.filename.replace(" ", "_")
        filename = f"{timestamp}_{safe_name}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        photo_paths.append(f"uploads/sell_photos/{filename}")

    try:
        price_value = request.form.get("price", 0)
        try:
            price_value = float(price_value)
        except (ValueError, TypeError):
            price_value = 0.0

        sell_request = SellRequest(
            user_id=user.user_id,
            category=request.form.get("category", ""),
            brand=request.form.get("brand", ""),
            model=request.form.get("model", ""),
            price=price_value,
            condition=request.form.get("condition", ""),
            description=request.form.get("description", ""),
            photos=",".join(photo_paths),
            status="Pending",
        )
        db.session.add(sell_request)
        db.session.commit()

        return jsonify({"status": "success", "id": f"US{sell_request.id:03d}"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500