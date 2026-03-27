/**
 * wishlist-sync.js
 * 
 * Syncs wishlist heart state across ALL pages from the server on every load.
 * Also handles add/remove toggling and keeps the wishlist badge count updated.
 *
 * Required button markup (use consistently in all templates):
 *   <button class="wishlistBtn" data-product-id="{{ product.id }}">
 *     <i class="fa-regular fa-heart"></i>
 *   </button>
 *
 * Active (wishlisted) state:  button gets class "active", icon switches to fa-solid
 * Inactive state:             icon switches to fa-regular
 *
 * Include this script on every page that shows product cards or detail views.
 */

(function () {

  // -------------------------------------------------------
  // 1. Fetch wishlist from server
  // -------------------------------------------------------
  async function fetchWishlist() {
    try {
      const res = await fetch('/api/wishlist/get', {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.success ? (data.wishlist || []) : [];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------
  // 2. Set a single button's visual state
  // -------------------------------------------------------
  function setButtonState(btn, isWishlisted) {
    const icon = btn.querySelector('i');
    if (isWishlisted) {
      btn.classList.add('active');
      if (icon) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
      }
    } else {
      btn.classList.remove('active');
      if (icon) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
      }
    }
  }

  // -------------------------------------------------------
  // 3. Update all wishlist badge elements on the page
  // -------------------------------------------------------
  function updateBadge(count) {
    document.querySelectorAll('.wishlist-badge, .wishlistBadge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  // -------------------------------------------------------
  // 4. Sync all heart buttons on the page with server state
  // -------------------------------------------------------
  async function syncWishlistUI() {
    const wishlist = await fetchWishlist();
    const wishlistedIds = new Set(wishlist.map(item => String(item.product_id)));

    document.querySelectorAll('.wishlistBtn').forEach(btn => {
      const id = String(btn.getAttribute('data-product-id'));
      setButtonState(btn, wishlistedIds.has(id));
    });

    updateBadge(wishlistedIds.size);
  }

  // -------------------------------------------------------
  // 5. Handle add/remove toggle on button click
  // -------------------------------------------------------
  async function handleToggle(btn) {
    const productId = btn.getAttribute('data-product-id');
    const isWishlisted = btn.classList.contains('active');

    // Optimistic UI update
    setButtonState(btn, !isWishlisted);

    try {
      let res;
      if (isWishlisted) {
        res = await fetch('/api/wishlist/remove', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId })
        });
      } else {
        res = await fetch('/api/wishlist/add', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId })
        });
      }

      if (res.status === 401) {
        // Not logged in — revert and redirect
        setButtonState(btn, isWishlisted);
        window.location.href = '/auth';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        // Revert optimistic update on failure
        setButtonState(btn, isWishlisted);
        return;
      }

      // Sync ALL buttons for this product (there may be duplicates on page)
      const newState = !isWishlisted;
      document.querySelectorAll(`.wishlistBtn[data-product-id="${productId}"]`)
        .forEach(b => setButtonState(b, newState));

      // Refresh badge from server
      const wishlist = await fetchWishlist();
      updateBadge(wishlist.length);

    } catch {
      // Network error — revert
      setButtonState(btn, isWishlisted);
    }
  }

  // -------------------------------------------------------
  // 6. Event delegation for all wishlist buttons
  // -------------------------------------------------------
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.wishlistBtn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    handleToggle(btn);
  });

  // -------------------------------------------------------
  // 7. Sync on page load and when user returns to the tab
  // -------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncWishlistUI);
  } else {
    syncWishlistUI();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncWishlistUI();
  });

})();
