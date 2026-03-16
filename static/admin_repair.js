async function loadRepairs() {
    const response = await fetch("/api/repairs");
    const repairs = await response.json();
    let html = "";

    repairs.forEach(r => {
        const isDisabled = r.status !== 'pending' ? 'disabled' : '';

        html += `
        <tr>
            <td>${r.booking_id}</td>
            <td>${r.name}</td>
            <td>${r.device}</td>
            <td>${r.issue}</td>
            <td>${r.date}</td>
            <td>${r.slot}</td>
            <td>
                <button onclick="updateStatus('${r.booking_id}', 'approved')" class="iconBtn approveBtn" ${isDisabled}>Approve</button>
                <button onclick="updateStatus('${r.booking_id}', 'rejected')" class="iconBtn rejectBtn" ${isDisabled}>Reject</button>
                <button onclick="updateStatus('${r.booking_id}', 'contacted')" class="iconBtn contactBtn" ${isDisabled}>Contact</button>
            </td>
            <td>
                <button onclick="viewRepair('${r.booking_id}')" class="viewBtn">View</button>
            </td>
            <td>
                <span class="status ${r.status}">
                    ${r.status}
                </span>
            </td>
        </tr>
        `;
    });

    document.getElementById("repairTable").innerHTML = html;
}

async function updateStatus(booking_id, status) {
    await fetch(`/api/update-status/${booking_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    });
    loadRepairs();
}

// FIXED: This now properly shows the modal
async function viewRepair(booking_id) {
    const res = await fetch("/api/repairs");
    const data = await res.json();
    const repair = data.find(r => String(r.booking_id) === String(booking_id));

    if (repair) {
        document.getElementById("modalContent").innerHTML = `
            <div style="line-height: 1.6; color: #333;">
                <p><b>Booking ID:</b> ${repair.booking_id}</p>
                <p><b>Customer:</b> ${repair.name}</p>
                <p><b>Email:</b> ${repair.email}</p>
                <p><b>Phone:</b> ${repair.phone}</p>
                <p><b>Device:</b> ${repair.device}</p>
                <p><b>Issue:</b> ${repair.issue}</p>
                <p><b>Date:</b> ${repair.date}</p>
                <p><b>Slot:</b> ${repair.slot}</p>
                <p><b>Status:</b> <span class="status ${repair.status}">${repair.status.toUpperCase()}</span></p>
            </div>
        `;
        // Use style.display because the HTML has inline display:none
        document.getElementById("modal").style.display = "flex";
    }
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

loadRepairs();