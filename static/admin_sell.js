document.addEventListener("DOMContentLoaded", fetchRequests);

// Store current modal data so contactCustomer() can read it
let currentModalData = {};

async function fetchRequests() {
    try {
        const res = await fetch('/api/admin/requests');
        if (res.status === 403) {
            document.getElementById("adminTableBody").innerHTML =
                `<tr><td colspan="9" style="text-align:center;padding:40px;color:#ef4444;">
                    <i class="fa-solid fa-lock"></i> Unauthorized. Please log in as admin.
                </td></tr>`;
            return;
        }
        const data = await res.json();
        const tbody = document.getElementById("adminTableBody");

        document.getElementById("requestCount").textContent = `(${data.length} total)`;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="empty-state">
                <i class="fa-solid fa-inbox"></i> No sell requests yet.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(req => {
            const isPending   = req.status.toLowerCase() === 'pending';
            const btnDisabled = isPending ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"';

            const date = req.createdAt
                ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

            const safeDesc = (req.description || '').replace(/"/g, '&quot;');
            const safeName = (req.userName   || '').replace(/"/g, '&quot;');

            return `
            <tr data-id="${req.id}"
                data-name="${safeName}"
                data-phone="${req.phone || ''}"
                data-email="${req.email || ''}"
                data-device="${req.category}"
                data-brand="${req.brand}"
                data-model="${req.model}"
                data-price="${req.price}"
                data-condition="${req.condition}"
                data-description="${safeDesc}"
                data-images="${req.photos || ''}">

                <td>
                    <b style="color:#6366f1;">US${req.id ? req.id.replace('US','') : ''}</b><br>
                    <small style="color:#94a3b8;">User #${req.userId}</small>
                </td>
                <td>
                    <div style="font-weight:600;">${req.userName}</div>
                    <small style="color:#94a3b8;">${req.phone || '—'}</small>
                </td>
                <td>${req.category}</td>
                <td>
                    <div style="font-weight:500;">${req.brand}</div>
                    <small style="color:#94a3b8;">${req.model}</small>
                </td>
                <td style="font-weight:600; color:#10b981;">₹${Number(req.price).toLocaleString('en-IN')}</td>
                <td style="color:#64748b; font-size:13px;">${date}</td>
                <td><span class="status ${req.status.toLowerCase()}">${req.status}</span></td>
                <td>
                    <button class="btn approve" onclick="updateStatus('${req.id}', 'Approved', this)" ${btnDisabled}>✔ Approve</button>
                    <button class="btn reject"  onclick="updateStatus('${req.id}', 'Rejected', this)" ${btnDisabled}>✖ Reject</button>
                </td>
                <td><button class="btn view" onclick="viewData(this)"><i class="fa-solid fa-eye"></i></button></td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error("Failed to load requests:", err);
        document.getElementById("adminTableBody").innerHTML =
            `<tr><td colspan="9" style="text-align:center;padding:40px;color:#ef4444;">Failed to load data. Please refresh.</td></tr>`;
    }
}

async function updateStatus(id, status, btn) {
    if (!confirm(`Are you sure you want to ${status === 'Approved' ? 'approve' : 'reject'} this request?`)) return;

    const tr = btn.closest("tr");
    tr.querySelectorAll(".approve, .reject").forEach(b => {
        b.disabled = true;
        b.style.opacity = "0.4";
        b.style.cursor = "not-allowed";
    });

    try {
        const res = await fetch('/api/admin/update-status', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, status })
        });
        const result = await res.json();

        if (result.status !== "success") {
            showToast("Error: " + result.message, "#ef4444");
            tr.querySelectorAll(".approve, .reject").forEach(b => {
                b.disabled = false;
                b.style.opacity = "1";
                b.style.cursor = "pointer";
            });
            return;
        }

        const span = tr.querySelector(".status");
        span.innerText  = status;
        span.className  = `status ${status.toLowerCase()}`;

        if (status === 'Approved') {
            showToast("✅ Request Approved! Email sent to customer.", "#10b981");
        } else {
            showToast("❌ Request Rejected. Email sent to customer.", "#ef4444");
        }

    } catch (err) {
        showToast("Network error. Please try again.", "#ef4444");
        console.error(err);
    }
}

function viewData(btn) {
    const d = btn.closest("tr").dataset;

    // Save for contactCustomer()
    currentModalData = d;

    document.getElementById("modalInfo").innerHTML = `
        <div class="info-group">
            <div class="info-label">Customer</div>
            <div class="info-value">${d.name}</div>
            <div style="color:#64748b; font-size:13px; margin-top:4px;">📞 ${d.phone || '—'} &nbsp;|&nbsp; ✉️ ${d.email || '—'}</div>
        </div>
        <div class="info-group">
            <div class="info-label">Device</div>
            <div class="info-value">${d.brand} ${d.model} <span style="color:#94a3b8; font-size:13px;">(${d.device})</span></div>
        </div>
        <div class="info-group">
            <div class="info-label">Condition</div>
            <div class="info-value">${d.condition}</div>
        </div>
        <div class="info-group">
            <div class="info-label">Expected Price</div>
            <div class="price-tag">₹${Number(d.price).toLocaleString('en-IN')}</div>
        </div>
        <div class="info-group">
            <div class="info-label">Description</div>
            <div class="desc-text">${d.description || 'No description provided.'}</div>
        </div>
    `;

    const mainImg = document.getElementById("mainImage");
    const thumbBox = document.getElementById("thumbnailContainer");
    thumbBox.innerHTML = "";

    if (d.images && d.images.trim() !== "") {
        const imgs = d.images.split(",").filter(s => s.trim());
        mainImg.src          = "/static/" + imgs[0].trim();
        mainImg.style.display = "block";

        imgs.forEach((src, i) => {
            const img     = document.createElement("img");
            img.src       = "/static/" + src.trim();
            img.className = "thumb-item " + (i === 0 ? "active" : "");
            img.onclick   = function () {
                mainImg.src = this.src;
                document.querySelectorAll(".thumb-item").forEach(t => t.classList.remove("active"));
                this.classList.add("active");
            };
            thumbBox.appendChild(img);
        });
    } else {
        mainImg.src           = "";
        mainImg.style.display = "none";
        thumbBox.innerHTML    = `<p class="no-image"><i class="fa-solid fa-image-slash" style="font-size:30px; margin-bottom:8px; display:block;"></i>No photos uploaded</p>`;
    }

    document.getElementById("modal").classList.add("show");
}

function contactCustomer() {
    const d = currentModalData;
    if (!d.email) {
        showToast("No email address on record for this customer.", "#f59e0b");
        return;
    }

    const subject = encodeURIComponent(`Regarding your sell request — ${d.brand} ${d.model}`);
    const body    = encodeURIComponent(
        `Hi ${d.name},\n\n` +
        `We have reviewed your request to sell your ${d.brand} ${d.model}.\n\n` +
        `Please reply to this email or call us at your earliest convenience to proceed further.\n\n` +
        `Thank you,\n2MB Computers Team`
    );

    window.open(`mailto:${d.email}?subject=${subject}&body=${body}`, '_blank');
}

function closeModal() {
    document.getElementById("modal").classList.remove("show");
}

function showToast(message, color = "#10b981") {
    const toast = document.getElementById("toastBox");
    const msg   = document.getElementById("toastMessage");
    toast.style.background = color;
    msg.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
}