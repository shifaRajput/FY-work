// ============================
// NAVIGATION
// ============================
const navItems = document.querySelectorAll(".navbar-center li");

navItems.forEach(item => {
  item.addEventListener("click", (e) => {
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});

window.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;

    const desktopLinks = document.querySelectorAll(".navbar-center a");
    const desktopLis = document.querySelectorAll(".navbar-center li");
    desktopLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            desktopLis.forEach(li => li.classList.remove("active"));
            link.parentElement.classList.add("active");
        }
    });

    const mobileLinks = document.querySelectorAll(".mobile-bottom-nav a.nav-item");
    mobileLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            mobileLinks.forEach(i => i.classList.remove("active"));
            link.classList.add("active");
        }
    });

    // Load cart on page load
    loadCart();
});

// ============================
// TOAST NOTIFICATION
// ============================
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.cart-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `cart-toast cart-toast-${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================
// LOAD CART FROM BACKEND
// ============================
function loadCart() {
    const loading = document.getElementById('cart-loading');
    const empty = document.getElementById('cart-empty');
    const cartItems = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');

    fetch('/cart_api/get')
        .then(res => {
            if (res.status === 401) {
                loading.style.display = 'none';
                empty.style.display = 'flex';
                empty.querySelector('h3').textContent = 'Please login to view cart';
                return null;
            }
            return res.json();
        })
        .then(data => {
            if (!data) return;

            loading.style.display = 'none';

            if (data.items.length === 0) {
                empty.style.display = 'flex';
                summary.style.display = 'none';
                cartItems.innerHTML = '';
                return;
            }

            // Render cart items
            cartItems.innerHTML = '';
            empty.style.display = 'none';

            data.items.forEach(item => {
                const imageSrc = item.image
                    ? `/static/uploads/${item.image}`
                    : '/static/image/no-image.png';

                const itemHTML = `
                <div class="cart-item" data-product-id="${item.product_id}" data-price="${item.price}">
                    <div class="left">
                        <img src="${imageSrc}" alt="${item.name}">
                        <div>
                            <h3>${item.name}</h3>
                            <p class="price">₹${item.price}</p>
                            <div class="qty">
                                <button class="minus" onclick="updateQty(${item.product_id}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button class="plus" onclick="updateQty(${item.product_id}, ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="right">
                        <p class="item-total">₹${item.item_total}</p>
                        <i class="fa fa-trash remove" onclick="removeItem(${item.product_id})"></i>
                    </div>
                </div>`;

                cartItems.innerHTML += itemHTML;
            });

            // Update summary
            summary.style.display = 'block';
            const delivery = 0;
            document.getElementById('subtotal').textContent = data.total.toFixed(0);
            document.getElementById('delivery').textContent = delivery;
            document.getElementById('grandtotal').textContent = (data.total + delivery).toFixed(0);

            // Update badge
            updateCartBadge();
        })
        .catch(err => {
            console.error('Cart load error:', err);
            loading.style.display = 'none';
            empty.style.display = 'flex';
        });
}

// ============================
// UPDATE QUANTITY
// ============================
function updateQty(productId, newQty) {
    if (newQty < 1) {
        removeItem(productId);
        return;
    }

    fetch(`/cart_api/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
    })
    .then(res => res.json())
    .then(() => {
        loadCart();
    });
}

// ============================
// REMOVE ITEM
// ============================
function removeItem(productId) {
    fetch(`/cart_api/delete/${productId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
            showToast('Item removed from cart');
            loadCart();
        });
}

// ============================
// CLEAR CART & PAYMENT BUTTONS
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const clearBtn = document.getElementById('clearCartBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your cart?')) {
                fetch('/cart_api/clear', { method: 'DELETE' })
                    .then(res => res.json())
                    .then(() => {
                        showToast('Cart cleared');
                        loadCart();
                    });
            }
        });
    }

    const payBtn = document.getElementById('paymentBtn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            window.location.href = '/payment';
        });
    }
});

// ============================
// CART BADGE
// ============================
function updateCartBadge() {
    fetch('/cart_api/count')
        .then(res => res.json())
        .then(data => {
            const badges = document.querySelectorAll('.cart-badge');
            badges.forEach(badge => {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        })
        .catch(() => {});
}