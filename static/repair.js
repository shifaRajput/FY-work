document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("repairForm");
    const button = form.querySelector(".btn");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        button.classList.add("loading");

        try {
            const formData = new FormData(form);
            const data = {
                userName: formData.get("userName"),
                userEmail: formData.get("userEmail"),
                userPhone: formData.get("userPhone"),
                deviceType: formData.get("deviceType"),
                brand: formData.get("brand"),
                model: formData.get("model"),
                issueDesc: formData.get("issueDesc"),
                issueDetail: formData.get("issueDetail"),
                date: formData.get("date"),
                slot: formData.get("slot")
            };

            const response = await fetch("/api/book-repair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            button.classList.remove("loading");

            if (response.ok && result.id) {
                button.classList.add("success");
                
                // Show SUCCESS custom modal
                showCustomAlert("Booking Confirmed!", `Your repair request was submitted successfully.<br><br><b>Booking ID: ${result.id}</b>`, "success");
                
                form.reset();
                
                // Reset button color after 3 seconds
                setTimeout(() => button.classList.remove("success"), 3000);
            } 
            else {
                // Show ERROR custom modal (e.g. "Please sign up first!")
                showCustomAlert("Wait a moment!", result.error || result.message, "error");
            }
        } 
        catch (error) {
            console.error(error);
            button.classList.remove("loading");
            // Show SERVER ERROR custom modal
            showCustomAlert("Connection Error", "Our server is taking a break. Please try again.", "error");
        }
    });
});

// ==========================================
//        CUSTOM ALERT FUNCTIONS
// ==========================================

function showCustomAlert(title, text, type) {
    const modal = document.getElementById("customAlert");
    const icon = document.getElementById("customAlertIcon");
    const titleEl = document.getElementById("customAlertTitle");
    const textEl = document.getElementById("customAlertText");
    const btn = document.getElementById("customAlertBtn");

    titleEl.innerHTML = title;
    textEl.innerHTML = text;

    // Change styling based on Success vs Error
    if (type === "success") {
        icon.innerHTML = '<i class="fa-solid fa-circle-check icon-success"></i>';
        btn.className = "custom-modal-btn"; // Default Blue
    } else {
        icon.innerHTML = '<i class="fa-solid fa-circle-xmark icon-error"></i>';
        btn.className = "custom-modal-btn error-btn"; // Red
    }

    modal.classList.add("show");
}

function closeCustomAlert() {
    const modal = document.getElementById("customAlert");
    modal.classList.remove("show");
}