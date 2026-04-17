/**
 * cart-sync.js
 *
 * Har page par cart badge ko database se sync karta hai.
 * Ye file EVERY page ke HTML mein include karni hai.
 *
 * Required HTML markup for badge (navbar mein):
 *   <a href="/cart">
 *     <i class="fa-solid fa-cart-shopping"></i>
 *     <span class="cart-badge" style="display:none;">0</span>
 *   </a>
 */

(function () {

  // -------------------------------------------------------
  // 1. Database se cart count fetch karo
  // -------------------------------------------------------
  async function fetchCartCount() {
    try {
      const res = await fetch('/cart_api/count', {
        credentials: 'include'
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    } catch {
      return 0;
    }
  }

  // -------------------------------------------------------
  // 2. Sabhi badge elements update karo
  // -------------------------------------------------------
  function updateBadge(count) {
    document.querySelectorAll('.cart-badge').forEach(badge => {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  }

  // -------------------------------------------------------
  // 3. Sync function — fetch + update
  // -------------------------------------------------------
  async function syncCartBadge() {
    const count = await fetchCartCount();
    updateBadge(count);
  }

  // -------------------------------------------------------
  // 4. Page load par aur tab switch par sync karo
  // -------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncCartBadge);
  } else {
    syncCartBadge();
  }

  // Jab user tab switch karke wapas aaye tab bhi update karo
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncCartBadge();
  });

  // -------------------------------------------------------
  // 5. Global function — koi bhi JS file badge update kar sake
  //    e.g. cart add hone ke baad: window.syncCartBadge()
  // -------------------------------------------------------
  window.syncCartBadge = syncCartBadge;

})();