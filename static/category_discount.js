
    const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');

if (filterBtn && filterDropdown) {
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('active');
    });

    window.onclick = (event) => {
        if (!filterBtn.contains(event.target) && !filterDropdown.contains(event.target)) {
            filterDropdown.classList.remove('active');
        }
    };
}

    // Back link
    document.querySelector(".back-btn").addEventListener("click", () => {
      window.history.back();
    });

        /**
 * Add product to wishlist
 */
async function addToWishlist(productId) {
    try {
        const response = await fetch('/api/wishlist/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ product_id: productId })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return false;
    }
}

/**
 * Remove product from wishlist
 */
async function removeFromWishlist(productId) {
    try {
        const response = await fetch('/api/wishlist/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ product_id: productId })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return false;
    }
}

/**
 * Get user's wishlist
 */
async function getWishlist() {
    try {
        const response = await fetch('/api/wishlist/get', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.success ? data.wishlist : [];
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return [];
    }
}

/**
 * Handle wishlist toggle on detail page
 */
async function handleDetailWishlistToggle(productId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const heartIcon = button.querySelector('i');
    
    // Check current state based on the CSS class
    const isCurrentlyInWishlist = button.classList.contains('active');

    try {
        let response;

        if (isCurrentlyInWishlist) {
            // If already in wishlist, remove it
            response = await fetch('/api/wishlist/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ product_id: productId })
            });
        } else {
            // If not in wishlist, add it
            response = await fetch('/api/wishlist/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ product_id: productId })
            });
        }

        // Handle not logged in
        if (response.status === 401) {
            if (confirm("Please login first to manage your wishlist!")) {
                window.location.href = '/auth';
            }
            return;
        }

        const data = await response.json();
        
        // Update the UI if the backend request was successful
        if (data.success) {
            if (isCurrentlyInWishlist) {
                // Item was removed: make heart empty
                heartIcon.classList.replace('fa-solid', 'fa-regular');
                button.classList.remove('active');
            } else {
                // Item was added: make heart solid red
                heartIcon.classList.replace('fa-regular', 'fa-solid');
                button.classList.add('active');
            }
        } else {
            console.error('Failed to update wishlist:', data.error);
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
    }
}

// Load wishlist state on page load
window.addEventListener('DOMContentLoaded', async () => {
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        const productId = parseInt(wishlistBtn.getAttribute('data-product-id'));
        const heartIcon = wishlistBtn.querySelector('i');
        const wishlist = await getWishlist();
        
        if (wishlist.some(item => item.product_id === productId)) {
            // Changed 'btn' to 'wishlistBtn' and 'icon' to 'heartIcon'
            wishlistBtn.classList.add("active");
            heartIcon.classList.remove("fa-regular");
            heartIcon.classList.add("fa-solid");
        }
    }
});

    // Filters
    const applyBtn = document.getElementById('applyFilters');
    const searchInput = document.getElementById('searchInput');

    function runFilters() {
        const query = searchInput.value.toLowerCase();
        const minP = parseFloat(document.getElementById('minPrice').value) || 0;
        const maxP = parseFloat(document.getElementById('maxPrice').value) || Infinity;
        const selectedBrands = Array.from(document.querySelectorAll('.brand-filter:checked')).map(cb => cb.value.toLowerCase());

        document.querySelectorAll('.product-card').forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            const price = parseFloat(card.dataset.price);
            const brand = card.dataset.brand.toLowerCase();

            const matches = title.includes(query) && 
                            price >= minP && price <= maxP && 
                            (selectedBrands.length === 0 || selectedBrands.includes(brand));
            
            card.style.display = matches ? "block" : "none";
        });
    }

    searchInput.addEventListener('input', runFilters);
    applyBtn.onclick = () => {
        runFilters();
        filterDropdown.classList.remove('active');
    };

    // Slider
    const sliders = document.querySelectorAll('.slider-container');
    sliders.forEach(slider => {
        let isDown = false;
        let startX;
        let scrollLeft;
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => isDown = false);
        slider.addEventListener('mouseup', () => isDown = false);
        slider.addEventListener('mousemove', (e) => {
            if(!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    });

   // ============================
// CART API INTEGRATION
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

// Check if item is already in cart on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge(); // Load badge immediately
    
    const btn = document.querySelector('.add-to-cart-btn');
    if (!btn) return;
    
    const productId = btn.dataset.id;
    
    fetch('/cart_api/get')
        .then(res => {
            if(res.status === 200) return res.json();
            return null;
        })
        .then(data => {
            if (data && data.items) {
                const item = data.items.find(i => i.product_id == productId);
                if (item) {
                    // Item is already in cart, show quantity state
                    btn.classList.add('added');
                    btn.querySelector('.qty').innerText = item.quantity;
                }
            }
        });
});

// Add to Cart Button Interactions
document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', e => {
        e.preventDefault();
        const target = e.target;
        const productId = button.dataset.id;
        let currentQty = parseInt(button.querySelector('.qty').innerText) || 1;

        // PLUS Logic
        if (target.classList.contains('plus')) {
            currentQty++;
            fetch(`/cart_api/update/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: currentQty })
            }).then(() => {
                button.querySelector('.qty').innerText = currentQty;
                updateCartBadge();
            });
            return;
        }

        // MINUS Logic
        if (target.classList.contains('minus')) {
            currentQty--;
            if (currentQty > 0) {
                fetch(`/cart_api/update/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: currentQty })
                }).then(() => {
                    button.querySelector('.qty').innerText = currentQty;
                    updateCartBadge();
                });
            } else {
                fetch(`/cart_api/delete/${productId}`, { method: 'DELETE' })
                    .then(() => {
                        button.classList.remove('added');
                        button.querySelector('.qty').innerText = 1;
                        updateCartBadge();
                    });
            }
            return;
        }

        // INITIAL ADD Logic
        if (!button.classList.contains('loading') && !button.classList.contains('added')) {
            fetch('/cart_api/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, quantity: 1 })
            })
            .then(res => {
                if (res.status === 401) {
                    alert('Please login first!');
                    window.location.href = '/auth';
                    throw new Error('Unauthorized');
                }
                return res.json();
            })
            .then(data => {
              // ADDED ALERT HERE TO CATCH ERRORS
              if (data.error) {
                  alert("Backend Error: " + data.error);
                  return; 
              }

              // Play the animation
              button.classList.add('loading');
              setTimeout(() => {
                  button.classList.remove('loading');
                  button.classList.add('added');
                  button.querySelector('.qty').innerText = 1;
                  updateCartBadge();
              }, 3400); 
          

                // Play the animation
                button.classList.add('loading');
                setTimeout(() => {
                    button.classList.remove('loading');
                    button.classList.add('added');
                    button.querySelector('.qty').innerText = 1;
                    updateCartBadge();
                }, 3400); 
            })
            .catch(err => console.log(err));
        }
    });
});
