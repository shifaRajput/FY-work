// Back link
document.querySelector(".back-btn").addEventListener("click", () => {
  window.history.back();
});

const container = document.getElementById('container');
const lens = document.getElementById('lens');
const result = document.getElementById('result');
const mainImg = document.getElementById('main-img');
const mainVideo = document.getElementById('main-video'); 
const thumbnails = document.querySelectorAll('.thumbnail-column > *'); 

// FULLSCREEN ELEMENTS
const fullscreenViewer = document.getElementById('fullscreenViewer');
const fullscreenImage = document.getElementById('fullscreenImage');
const closeViewer = document.getElementById('closeViewer');
const prevBtn = document.getElementById('prevImage');
const nextBtn = document.getElementById('nextImage');

let currentIndex = 0;
const images = Array.from(document.querySelectorAll('.thumbnail-column img')).map(img => img.src);

// --- THUMBNAIL CLICK LOGIC ---
thumbnails.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    thumbnails.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');

    const videoSrc = thumb.getAttribute('data-src');

    if (videoSrc) {
      mainImg.style.display = 'none';
      lens.style.display = 'none';
      result.style.display = 'none'; 
      mainVideo.style.display = 'block';
      mainVideo.src = videoSrc;
      mainVideo.load();
      mainVideo.play().catch(e => console.log("Playback interaction required"));
    } else {
      mainVideo.pause();
      mainVideo.style.display = 'none';
      mainImg.style.display = 'block';
      mainImg.src = thumb.src;
      result.style.backgroundImage = `url('${thumb.src}')`;
      currentIndex = images.indexOf(thumb.src);
    }
  });
});

// --- DESKTOP ZOOM ---
container.addEventListener('mousemove', moveLens);
container.addEventListener('mouseenter', () => {
  if (window.innerWidth > 768 && mainImg.style.display !== 'none') {
    lens.style.display = 'block';
    result.style.display = 'block';
  }
});
container.addEventListener('mouseleave', () => {
  lens.style.display = 'none';
  result.style.display = 'none';
});

function moveLens(e) {
  if (window.innerWidth <= 768 || mainImg.style.display === 'none') return;

  const rect = container.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  let posX = x - (lens.offsetWidth / 2);
  let posY = y - (lens.offsetHeight / 2);

  if (posX < 0) posX = 0;
  if (posY < 0) posY = 0;
  if (posX > rect.width - lens.offsetWidth) posX = rect.width - lens.offsetWidth;
  if (posY > rect.height - lens.offsetHeight) posY = rect.height - lens.offsetHeight;

  lens.style.left = posX + 'px';
  lens.style.top = posY + 'px';

  const ratioX = result.offsetWidth / lens.offsetWidth;
  const ratioY = result.offsetHeight / lens.offsetHeight;

  result.style.backgroundImage = `url('${mainImg.src}')`;
  result.style.backgroundSize = (mainImg.width * ratioX) + "px " + (mainImg.height * ratioY) + "px";
  result.style.backgroundPosition = `-${posX * ratioX}px -${posY * ratioY}px`;
}

// --- MOBILE FULLSCREEN ---
mainImg.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    fullscreenViewer.classList.add('active');
    fullscreenImage.src = images[currentIndex];
  }
});

closeViewer.addEventListener('click', () => {
  fullscreenViewer.classList.remove('active');
});

prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  fullscreenImage.src = images[currentIndex];
});

nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % images.length;
  fullscreenImage.src = images[currentIndex];
});

let startX = 0;
fullscreenViewer.addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
});
fullscreenViewer.addEventListener('touchend', e => {
  let endX = e.changedTouches[0].clientX;
  if (startX - endX > 50) nextBtn.click();
  if (endX - startX > 50) prevBtn.click();
});

// --- TABS & OTHER ---
function openTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-btn");

  tabs.forEach(tab => tab.classList.remove("active"));
  buttons.forEach(btn => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.target.classList.add("active");
}

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
