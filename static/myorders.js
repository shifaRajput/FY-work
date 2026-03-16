// ── Device Icon Helper ─────────────────────────────────────────────────────
function deviceIcon(deviceType) {
    const icons = {
        'laptop':     'fa-laptop',
        'smartphone': 'fa-mobile-screen',
        'phone':      'fa-mobile-screen',
        'tablet':     'fa-tablet-screen-button',
        'desktop':    'fa-desktop',
        'monitor':    'fa-display',
        'printer':    'fa-print',
        'camera':     'fa-camera',
        'headphone':  'fa-headphones',
        'keyboard':   'fa-keyboard',
        'mouse':      'fa-computer-mouse',
    };
    const key = (deviceType || '').toLowerCase();
    for (const [k, icon] of Object.entries(icons)) {
        if (key.includes(k)) return icon;
    }
    return 'fa-microchip';
}

// ── Badge Class ────────────────────────────────────────────────────────────
function badgeClass(status) {
    const map = {
        'Order Placed':     'badge-placed',
        'Packed':           'badge-packed',
        'Shipped':          'badge-shipped',
        'Out for Delivery': 'badge-delivery',
        'Received':         'badge-received',
        'Return Requested': 'badge-return',
        'Returned':         'badge-return',
        'Cancelled':        'badge-cancelled',
    };
    return map[status] || 'badge-placed';
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `show ${type}`;
    setTimeout(() => { toast.className = ''; }, 3000);
}

// ── Modal (promise-based) ──────────────────────────────────────────────────
let _modalResolve = null;

function openModal(title, text) {
    return new Promise(resolve => {
        _modalResolve = resolve;
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent  = text;
        document.getElementById('confirmModal').classList.add('active');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modalBtnYes').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
        if (_modalResolve) { _modalResolve(true);  _modalResolve = null; }
    });
    document.getElementById('modalBtnNo').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
        if (_modalResolve) { _modalResolve(false); _modalResolve = null; }
    });
});

// ── Timeline ───────────────────────────────────────────────────────────────
const STEPS = [
    { label: 'Order Placed',     key: 'date_ordered' },
    { label: 'Packed',           key: 'date_packed' },
    { label: 'Shipped',          key: 'date_shipped' },
    { label: 'Out for Delivery', key: 'date_out_for_delivery' },
    { label: 'Received',         key: 'date_delivered' },
];

const STATUS_STEP_INDEX = {
    'Order Placed':     0,
    'Packed':           1,
    'Shipped':          2,
    'Out for Delivery': 3,
    'Received':         4,
    'Return Requested': 4,
    'Returned':         4,
    'Cancelled':        0,
};

function buildTimeline(order) {
    const currentIdx  = STATUS_STEP_INDEX[order.status] ?? 0;
    const isCancelled = order.status === 'Cancelled';

    const stepsHtml = STEPS.map((step, i) => {
        const isActive = !isCancelled && i <= currentIdx;
        const dateVal  = order[step.key];
        const dateStr  = dateVal ? `<p class="timeline-date"><i class="fas fa-clock" style="margin-right:4px;"></i>${dateVal}</p>` : '';
        return `
        <div class="timeline-step ${isActive ? 'active' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <h4>${step.label}</h4>
                ${dateStr}
            </div>
        </div>`;
    }).join('');

    const fillPct = isCancelled ? 0 : Math.round((currentIdx / (STEPS.length - 1)) * 100);

    const cancelledBanner = isCancelled
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:12px;color:#dc2626;font-size:13px;font-weight:600;">
               <i class="fas fa-circle-xmark" style="margin-right:6px;"></i>This order was cancelled.
           </div>`
        : '';

    const returnBanner = order.status === 'Return Requested'
        ? `<div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 14px;margin-bottom:12px;color:#9333ea;font-size:13px;font-weight:600;">
               <i class="fas fa-rotate-left" style="margin-right:6px;"></i>Return requested on ${order.date_return_requested || '—'}.
           </div>`
        : '';

    const addressHtml = order.delivery_address
        ? `<div class="delivery-info">
               <strong><i class="fas fa-location-dot" style="margin-right:5px;color:#2563eb;"></i>Delivery Address</strong>
               ${order.delivery_address}
           </div>`
        : '';

    return `
    ${cancelledBanner}${returnBanner}
    <div class="timeline">
        <div class="timeline-line-bg"></div>
        <div class="timeline-line-fill" style="height:0%" data-fill="${fillPct}%"></div>
        ${stepsHtml}
    </div>
    ${addressHtml}`;
}

function animateTimelines() {
    document.querySelectorAll('.timeline-line-fill').forEach(el => {
        const target = el.getAttribute('data-fill');
        requestAnimationFrame(() => { el.style.height = target; });
    });
}

// ── Build Order Card ───────────────────────────────────────────────────────
function buildOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.orderId = order.order_id;

    const canCancel   = !['Out for Delivery','Received','Return Requested','Returned','Cancelled'].includes(order.status);
    const canReturn   = order.status === 'Received';
    const isCancelled = order.status === 'Cancelled';

    const priceStr = `₹${Number(order.price).toLocaleString('en-IN')}`;
    const dateStr  = order.date_ordered ? order.date_ordered.slice(0, 10) : '';
    const icon     = deviceIcon(order.device_type);
    const brand    = order.brand ? `<p class="product-brand">${order.brand}</p>` : '';
    const grade    = order.grade ? ` · Grade ${order.grade}` : '';

    card.innerHTML = `
    <div class="card-header">
        <div class="order-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="order-details">
            <h3 class="product-name">${order.product_name}</h3>
            ${brand}
            <p class="order-price">${priceStr}<span style="font-size:12px;font-weight:400;color:#64748b;">${grade}</span></p>
            <p class="order-qty">Qty: ${order.quantity} &nbsp;·&nbsp; <span style="color:#94a3b8;font-size:12px;">Ordered: ${dateStr}</span></p>
            <p class="order-status-text">
                <span class="status-badge ${badgeClass(order.status)}">${order.status}</span>
            </p>
        </div>
        <div class="order-actions">
            <button class="btn-track" data-id="${order.order_id}">
                <i class="fas fa-chevron-down"></i> Track Order
            </button>
            ${!isCancelled ? `
            <button class="btn-cancel ${canCancel ? '' : 'disabled'}" data-id="${order.order_id}" ${canCancel ? '' : 'disabled'}>
                <i class="fas fa-xmark"></i> Cancel Order
            </button>` : ''}
            ${canReturn ? `
            <button class="btn-return" data-id="${order.order_id}">
                <i class="fas fa-rotate-left"></i> Return Product
            </button>` : ''}
        </div>
    </div>
    <div class="timeline-container">
        ${buildTimeline(order)}
    </div>`;

    // Track toggle
    card.querySelector('.btn-track').addEventListener('click', function () {
        const isExpanded = card.classList.toggle('expanded');
        this.innerHTML = isExpanded
            ? '<i class="fas fa-chevron-up"></i> Hide Tracking'
            : '<i class="fas fa-chevron-down"></i> Track Order';
        if (isExpanded) setTimeout(animateTimelines, 50);
    });

    // Cancel
    const cancelBtn = card.querySelector('.btn-cancel');
    if (cancelBtn && canCancel) {
        cancelBtn.addEventListener('click', async () => {
            const ok = await openModal('Cancel Order', `Cancel your order for "${order.product_name}"?`);
            if (!ok) return;
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling…';
            const res  = await fetch(`/api/cancel-order/${order.order_id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Order cancelled successfully.', 'success');
                loadOrders();
            } else {
                showToast(data.error || 'Could not cancel order.', 'error');
                cancelBtn.disabled = false;
                cancelBtn.innerHTML = '<i class="fas fa-xmark"></i> Cancel Order';
            }
        });
    }

    // Return
    const returnBtn = card.querySelector('.btn-return');
    if (returnBtn) {
        returnBtn.addEventListener('click', async () => {
            const ok = await openModal('Return Product', `Request a return for "${order.product_name}"? Our team will contact you.`);
            if (!ok) return;
            returnBtn.disabled = true;
            returnBtn.textContent = 'Requesting…';
            const res  = await fetch(`/api/return-order/${order.order_id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Return requested! We will be in touch soon.', 'success');
                loadOrders();
            } else {
                showToast(data.error || 'Could not request return.', 'error');
                returnBtn.disabled = false;
                returnBtn.innerHTML = '<i class="fas fa-rotate-left"></i> Return Product';
            }
        });
    }

    return card;
}

// ── Load Orders ────────────────────────────────────────────────────────────
function loadOrders() {
    const ordersList  = document.getElementById('orders-list');
    const loadingDiv  = document.getElementById('loading');
    const noOrdersDiv = document.getElementById('no-orders');

    ordersList.innerHTML  = '';
    loadingDiv.style.display  = 'block';
    noOrdersDiv.style.display = 'none';

    fetch('/api/orders')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(orders => {
            loadingDiv.style.display = 'none';
            if (!orders.length) { noOrdersDiv.style.display = 'block'; return; }
            orders.forEach(order => ordersList.appendChild(buildOrderCard(order)));
        })
        .catch(err => {
            console.error(err);
            loadingDiv.innerHTML = '<p style="color:#ef4444"><i class="fas fa-triangle-exclamation"></i> Error loading orders. Please refresh.</p>';
        });
}

document.addEventListener('DOMContentLoaded', loadOrders);