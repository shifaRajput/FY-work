// Navigation bar active state
window.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    
    // Desktop Navigation
    const desktopLinks = document.querySelectorAll(".navbar-center a");
    const desktopLis = document.querySelectorAll(".navbar-center li");
    
    desktopLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            desktopLis.forEach(li => li.classList.remove("active"));
            link.parentElement.classList.add("active");
        }
    });

    // Mobile Bottom Navigation
    const mobileLinks = document.querySelectorAll(".mobile-bottom-nav a.nav-item");
    
    mobileLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            mobileLinks.forEach(i => i.classList.remove("active"));
            link.classList.add("active");
        }
    });

    // Load wishlist on page load
    loadWishlist();
});

// =====================
// WISHLIST API CALLS
// =====================

/**
 * Get all available products
 */
async function getAllProducts() {
    try {
        const response = await fetch('/api/products/all', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            console.error('Error fetching products:', data.error);
            return [];
        }
        
        return data.products;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

/**
 * Get user's wishlist
 */
async function getWishlist() {
    try {
        console.log('🌐 Fetching wishlist from API...');
        const response = await fetch('/api/wishlist/get', {
            method: 'GET',
            credentials: 'include'  // Important: send cookies
        });
        
        console.log('📬 API Response status:', response.status);
        const data = await response.json();
        
        console.log('📦 Full API Response:', data);
        
        if (!data.success) {
            console.error('❌ API returned error:', data.error);
            return [];
        }
        
        const wishlistData = data.wishlist || [];
        console.log('✅ Wishlist items from API:', wishlistData);
        console.log('📊 Item count:', wishlistData.length);
        return wishlistData;
    } catch (error) {
        console.error('❌ Error fetching wishlist:', error);
        return [];
    }
}

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
            credentials: 'include',  // Important: send cookies
            body: JSON.stringify({ product_id: productId })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert(data.error || 'Failed to add to wishlist');
            return false;
        }
        
        // Reload wishlist display
        loadWishlist();
        return true;
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        alert('Failed to add to wishlist');
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
        
        if (!data.success) {
            alert(data.error || 'Failed to remove from wishlist');
            return false;
        }
        
        // Reload wishlist display
        loadWishlist();
        return true;
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        alert('Failed to remove from wishlist');
        return false;
    }
}

/**
 * Clear entire wishlist
 */
async function clearWishlistAll() {
    if (!confirm('Are you sure you want to clear your entire wishlist?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/wishlist/clear', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert(data.error || 'Failed to clear wishlist');
            return false;
        }
        
        loadWishlist();
        return true;
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        alert('Failed to clear wishlist');
        return false;
    }
}

// =====================
// UI FUNCTIONS
// =====================

/**
 * Load and display wishlist
 */
async function loadWishlist() {
    const wishlistContainer = document.getElementById('wishlistProducts');
    const emptyState = document.getElementById('emptyState');
    const clearBtn = document.getElementById('clearBtn');
    
    console.log('🔄 Loading wishlist...');
    const wishlist = await getWishlist();
    
    console.log('✅ Wishlist loaded:', wishlist);
    console.log('📊 Wishlist length:', wishlist.length);
    console.log('📋 Wishlist details:', JSON.stringify(wishlist, null, 2));
    
    if (!wishlist || wishlist.length === 0) {
        console.log('⚠️ Wishlist is empty');
        wishlistContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        clearBtn.style.display = 'none';
        return;
    }
    
    wishlistContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    clearBtn.style.display = 'block';
    
    // Clear previous items
    wishlistContainer.innerHTML = '';
    
    // Add each wishlist item
    wishlist.forEach((item, index) => {
        console.log(`🎴 Creating card ${index}:`, item);
        console.log('   - product_id:', item.product_id);
        console.log('   - name:', item.name);
        console.log('   - created_date_time:', item.created_date_time);
        console.log('   - image_url:', item.image_url);
        const productCard = createProductCard(item, true);
        wishlistContainer.appendChild(productCard);
    });
    console.log('✨ Wishlist rendering complete');
}

/**
 * Create a product card element
 */
function createProductCard(product, inWishlist = false) {
    const card = document.createElement('div');
    card.className = 'product';
    card.dataset.productId = product.product_id || product.id;
    
    const imageUrl = product.image_url || '/static/images/placeholder.jpg';
    const price = product.real_price ? `₹${product.real_price.toLocaleString()}` : 'N/A';
    
    // Format date
    let dateStr = '';
    const dateFieldName = product.created_date_time || product.added_at;
    if (dateFieldName) {
        try {
            // Try to parse ISO format first
            const date = new Date(dateFieldName);
            if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            dateStr = dateFieldName;
        }
    }
    
    console.log('Product:', product.name, 'Date:', dateFieldName, 'Formatted:', dateStr);
    
    card.innerHTML = `
        <div class="heart ${inWishlist ? 'active' : ''}" onclick="handleWishlistToggle(${product.product_id || product.id}, event)" title="Add/Remove from wishlist">
            <i class="fa fa-heart"></i>
        </div>
        
        <img src="${imageUrl}" class="product-img" alt="${product.name}">
        
        <h3 class="pname">${product.name}</h3>
        <p class="brand">${product.brand || 'Brand'}</p>
        <p class="grade">Grade: ${product.grade || 'N/A'}</p>
        <p class="price">${price}</p>
        ${dateStr ? `<p class="added-date">Added: ${dateStr}</p>` : '<p class="added-date">Date: Not available</p>'}
        
        <button class="add-to-cart-btn" onclick="handleAddToCart(${product.product_id || product.id}, '${product.name}', ${product.real_price}, '${imageUrl}')">
            Add to Cart
        </button>
    `;
    
    return card;
}

/**
 * Handle wishlist toggle (add/remove)
 */
async function handleWishlistToggle(productId, event) {
    event.stopPropagation();
    
    const wishlist = await getWishlist();
    const isInWishlist = wishlist.some(item => item.product_id === productId);
    
    if (isInWishlist) {
        await removeFromWishlist(productId);
    } else {
        await addToWishlist(productId);
    }
}

/**
 * Handle add to cart
 */
function handleAddToCart(productId, productName, productPrice, productImage) {
    // Get current cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.product_id === productId);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({
            product_id: productId,
            name: productName,
            price: productPrice,
            image_url: productImage,
            quantity: 1
        });
    }
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show confirmation
    alert(`${productName} added to cart!`);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearWishlistAll);
    }
});