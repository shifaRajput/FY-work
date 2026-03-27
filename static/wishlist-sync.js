/**
 * Wishlist Sync Script
 * This script synchronizes wishlist state across all pages
 * It ensures that when you add/remove items from wishlist on any page,
 * all other pages reflect the changes
 */

/**
 * Get current wishlist from the server
 */
async function getWishlist() {
    try {
        const response = await fetch('/api/wishlist/get', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch wishlist: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.wishlist) {
            return data.wishlist;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return [];
    }
}

/**
 * Update all wishlist buttons on the current page based on server state
 */
async function syncWishlistUI() {
    try {
        const wishlist = await getWishlist();
        
        // Extract product IDs from wishlist
        const wishlistProductIds = new Set(
            wishlist.map(item => item.product_id)
        );
        
        // Update all wishlist buttons
        const wishlistBtns = document.querySelectorAll('.wishlistBtn');
        
        wishlistBtns.forEach(btn => {
            const productId = parseInt(btn.getAttribute('data-product-id'));
            const heartIcon = btn.querySelector('i');
            
            if (wishlistProductIds.has(productId)) {
                // Product is in wishlist
                btn.classList.add('active');
                if (heartIcon) {
                    heartIcon.classList.replace('fa-regular', 'fa-solid');
                }
            } else {
                // Product is not in wishlist
                btn.classList.remove('active');
                if (heartIcon) {
                    heartIcon.classList.replace('fa-solid', 'fa-regular');
                }
            }
        });
        
        console.log('Wishlist UI synced with', wishlistProductIds.size, 'items');
    } catch (error) {
        console.error('Error syncing wishlist UI:', error);
    }
}

/**
 * Load and sync wishlist on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    syncWishlistUI();
});

/**
 * Re-sync wishlist when page becomes visible (user returns from another tab/page)
 */
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        syncWishlistUI();
    }
});

/**
 * Ensure wishlist sync happens after any wishlist toggle
 * Wait for the global function to be defined if it doesn't exist yet
 */
function setupWishlistToggleSync() {
    if (typeof handleDetailWishlistToggle === 'function') {
        const originalToggle = handleDetailWishlistToggle;
        
        // Redefine the function to include sync
        window.handleDetailWishlistToggle = async function(productId, event) {
            // Call the original function
            await originalToggle(productId, event);
            
            // Sync the UI on all pages after the toggle
            setTimeout(() => {
                syncWishlistUI();
            }, 500);
        };
    }
}

// Setup sync when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWishlistToggleSync);
} else {
    setupWishlistToggleSync();
}

// Also try again after a delay to catch late-loading scripts
setTimeout(setupWishlistToggleSync, 1000);
