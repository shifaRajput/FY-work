// navigation bar 
const navItems = document.querySelectorAll(".navbar-center li");

navItems.forEach(item => {
  item.addEventListener("click", (e) => {
    // Check if the click was on an anchor tag or inside the li
    // We want the browser to follow the link, so we don't use e.preventDefault()
    
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});

window.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    
    // --- Desktop Navigation ---
    const desktopLinks = document.querySelectorAll(".navbar-center a");
    const desktopLis = document.querySelectorAll(".navbar-center li");
    
    desktopLinks.forEach(link => {
        // If the link matches the current Flask route
        if (link.getAttribute("href") === currentPath) {
            desktopLis.forEach(li => li.classList.remove("active"));
            link.parentElement.classList.add("active");
        }
    });

    // --- Mobile Bottom Navigation ---
    const mobileLinks = document.querySelectorAll(".mobile-bottom-nav a.nav-item");
    
    mobileLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            mobileLinks.forEach(i => i.classList.remove("active"));
            link.classList.add("active");
        }
    });
});

// ── Element refs ──────────────────────────────────────────────────────────────
const fileInput    = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const form         = document.getElementById("sellForm");
const submitBtn    = document.getElementById("submitBtn");
const emailInput   = document.getElementById("userEmail");
const nameInput    = document.getElementById("userName");
const phoneInput   = document.getElementById("phone");
const photoError   = document.getElementById("photoError");

// ── Auto-fill name & phone when user types email and tabs out ─────────────────
// Only runs if the email field is NOT readonly (i.e. user is not already logged in)
if (emailInput && !emailInput.readOnly) {
    emailInput.addEventListener("blur", async function () {
        const email = this.value.trim();
        if (!email) return;

        try {
            const res    = await fetch("/api/get-user-by-email", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email }),
            });
            const result = await res.json();

            if (result.status === "success") {
                nameInput.value    = result.name;
                phoneInput.value   = result.phone;
                nameInput.readOnly  = true;
                phoneInput.readOnly = true;
            } else {
                // Show "not registered" modal
                document.getElementById("customModal").style.display = "flex";
                nameInput.value    = "";
                phoneInput.value   = "";
                nameInput.readOnly  = false;
                phoneInput.readOnly = false;
            }
        } catch (err) {
            console.error("Auto-fill error:", err);
        }
    });
}

// ── Image preview ─────────────────────────────────────────────────────────────
fileInput.addEventListener("change", function () {
    imagePreview.innerHTML = "";
    photoError.style.display = "none";

    const files = Array.from(this.files);
    if (files.length > 5) {
        alert("Maximum 5 photos allowed.");
        this.value = "";
        return;
    }

    files.forEach(file => {
        const reader  = new FileReader();
        reader.onload = (e) => {
            const img   = document.createElement("img");
            img.src     = e.target.result;
            img.style.cssText =
                "width:70px;height:70px;object-fit:cover;" +
                "border-radius:10px;margin:8px 4px 0 0;" +
                "border:2px solid #6366f1;";
            imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// ── Form submission ───────────────────────────────────────────────────────────
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Validate photo
    if (fileInput.files.length < 1) {
        photoError.style.display = "block";
        fileInput.scrollIntoView({ behavior: "smooth" });
        return;
    }
    photoError.style.display = "none";

    // Disable button to prevent double-submit
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");

    try {
        const formData = new FormData(form);
        const res      = await fetch("/api/sell-device", {
            method: "POST",
            body:   formData,
        });
        const result   = await res.json();

        if (result.status === "success") {
            document.getElementById("successRequestId").innerText = result.id;
            document.getElementById("successModal").style.display = "flex";

            // Reset form
            form.reset();
            imagePreview.innerHTML  = "";
            nameInput.readOnly       = false;
            phoneInput.readOnly      = false;
        } else {
            alert("Error: " + (result.message || "Something went wrong. Please try again."));
        }
    } catch (err) {
        alert("Network error. Please check your connection and try again.");
        console.error("Submit error:", err);
    }

    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
});

// ── Modal helpers ─────────────────────────────────────────────────────────────
function closeModal() {
    document.getElementById("customModal").style.display = "none";
    emailInput.value   = "";
    emailInput.focus();
}

function closeSuccessModal() {
    document.getElementById("successModal").style.display = "none";
}