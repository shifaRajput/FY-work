// navigation bar 
const navItems = document.querySelectorAll(".navbar-center li");

navItems.forEach(item => {
  item.addEventListener("click", (e) => {
    // Check if the click was on an anchor tag or inside the li
    // We want the browser to follow the link, so we don't use e.preventDefault()
    
    navItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});

window.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    
    // --- Desktop Navigation ---
    const desktopLinks = document.querySelectorAll(".navbar-center a");
    const desktopLis = document.querySelectorAll(".navbar-center li");
    
    desktopLinks.forEach(link => {
        // If the link matches the current Flask route
        if (link.getAttribute("href") === currentPath) {
            desktopLis.forEach(li => li.classList.remove("active"));
            link.parentElement.classList.add("active");
        }
    });

    // --- Mobile Bottom Navigation ---
    const mobileLinks = document.querySelectorAll(".mobile-bottom-nav a.nav-item");
    
    mobileLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            mobileLinks.forEach(i => i.classList.remove("active"));
            link.classList.add("active");
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


// image slider
let curPage = 1;
const pages = document.querySelectorAll(".skw-page");
const numOfPages = pages.length;
const animTime = 1000;
let scrolling = false;
const autoSlideTime = 3000; // 3 seconds

function pagination() {
  scrolling = true;

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    page.classList.remove("active", "inactive");

    if (pageNum === curPage) {
      page.classList.add("active");
      page.classList.remove("inactive");
    } else if (pageNum === curPage - 1) {
      page.classList.add("inactive");
    }
  });

  setTimeout(() => {
    scrolling = false;
  }, animTime);
}

function navigateUp() {
  if (curPage === 1) return;
  curPage--;
  pagination();
}

function navigateDown() {
  if (curPage === numOfPages) {
    curPage = 1; // loop back to first slide
  } else {
    curPage++;
  }
  pagination();
}

// Auto slide
setInterval(() => {
  if (!scrolling) {
    navigateDown();
  }
}, autoSlideTime);

document.addEventListener("click", function (e) {
  if (e.target.closest("a, button")) {
    e.stopPropagation(); // allow link navigation
  }
});

document.addEventListener("keydown", function (e) {
  if (scrolling) return;
  if (e.key === "ArrowUp") {
    navigateUp(); 
  } else if (e.key === "ArrowDown") {
    navigateDown();
  }
});

// Heart Icon - Load wishlist state on page load
window.addEventListener('DOMContentLoaded', async () => {
    const wishlist = await getWishlist();
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const productId = parseInt(card.getAttribute('data-product-id'));
        const heartIcon = card.querySelector('.heart-icon');
        
        if (heartIcon && wishlist.some(item => item.product_id === productId)) {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas', 'active');
        }
    });
});

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

document.addEventListener("DOMContentLoaded", () => {
    const chatButton = document.getElementById("chat-button");
    const chatBox = document.getElementById("chat-box");
    const chatClose = document.getElementById("chat-close");
    const sendBtn = document.getElementById("send-btn");
    const chatText = document.getElementById("chat-text");
    const chatMessages = document.getElementById("chat-messages");
    const hMouth = document.querySelector(".h-mouth");
    const pupils = document.querySelectorAll(".pupil"); // Re-added eye tracking

    // 1. DATA STRUCTURE FOR QUESTIONS
    const menuData = {
        main: [
            { text: "🛒 Buying a Product", next: "buying" },
            { text: "🚚 Order & Delivery", next: "delivery" },
            { text: "🔧 Repair Service", next: "repair" },
            { text: "💰 Sell My Device", next: "sell" },
            { text: "👤 Account & Cart Help", next: "account" },
            { text: "📞 Contact Support", next: "contact" }
        ],
        buying: [
            { text: "How do I buy a product?", ans: "You can buy in 2 ways:\n• Click Buy Now on product page\n• Or add to cart and checkout.\nWe deliver across India." },
            { text: "Is the product original?", ans: "All products are tested and verified second-hand devices. Each description shows condition details clearly." },
            { text: "Is there warranty?", ans: "Warranty details are mentioned on each product page. Some include limited warranty based on condition." },
            { text: "How to check condition?", ans: "Open the product page to see:\n• Real images\n• Condition details\n• Specifications" },
            { text: "⬅️ Back", next: "main" }
        ],
        delivery: [
            { text: "How can I track my order?", ans: "Go to Order Page → Click on your order → View tracking details." },
            { text: "How long is delivery?", ans: "Delivery usually takes 3–7 working days depending on your location." },
            { text: "Can I cancel my order?", ans: "You can cancel before it is shipped via the Order page. If not available, contact admin." },
            { text: "Payment methods?", ans: "You can pay using: Online Payment, Cash on Delivery(if availabe)" },
            { text: "⬅️ Back", next: "main" }
        ],
        repair: [
            { text: "How to request repair?", ans: "Go to Repair Page, fill the form. We repair Laptops, Computers, and Smartphones." },
            { text: "Do you repair all brands?", ans: "Yes, we repair most major brands. Admin will confirm after reviewing your form." },
            { text: "Repair charges?", ans: "Changes depend on the issue. Admin will inform you after checking your request." },
            { text: "⬅️ Back", next: "main" }
        ],
        sell: [
            { text: "How can I sell my device?", ans: "Go to Sell Page, fill the form. Admin will review and contact you." },
            { text: "How will I get payment?", ans: "Payment method will be discussed after device verification by admin." },
            { text: "What devices can I sell?", ans: "You can sell Laptops, Computers, and Smartphones." },
            { text: "⬅️ Back", next: "main" }
        ],
        account: [
            { text: "How to see my orders?", ans: "Go to Order Page to see current and old orders." },
            { text: "How to update profile?", ans: "Go to Me Page to edit Name, Phone, and Address." },
            { text: "My cart item disappeared", ans: "Make sure you are logged in. If still missing, contact support." },
            { text: "⬅️ Back", next: "main" }
        ],
        contact: [
            { text: "View Contact Info", ans: "📞 Contact Admin\nPhone: +91-8291828540\n📍 Address: Opposite DNA hospital,Maqbool CMP, Pathan wahi, Malad East" },
            { text: "⬅️ Back", next: "main" }
        ]
    };

    // 2. WIDGET CONTROLS & EYE TRACKING
    chatButton.onclick = () => {
        chatBox.classList.add("active");
        chatButton.style.display = "none";
        
        // Starts the menu if the chat is empty
        if (chatMessages.innerHTML.trim() === "") { 
            showMenu("main", "Hi 👋 How can we help you today?");
        }
    };

    chatClose.onclick = () => {
        chatBox.classList.remove("active");
        chatButton.style.display = "flex";
    };

    // Eye Tracking Logic (Restored from Old JS)
    document.addEventListener("mousemove", (e) => {
        const x = (e.clientX / window.innerWidth) * 5 - 2.5;
        const y = (e.clientY / window.innerHeight) * 5 - 2.5;
        pupils.forEach(p => {
            p.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

    // 3. CORE FUNCTIONS
    function appendMsg(text, side) {
        const div = document.createElement("div");
        div.className = `message ${side}`;
        div.innerText = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    function showMenu(menuKey, greetingText) {
        if (greetingText) appendMsg(greetingText, "bot");
        
        const optionsContainer = document.createElement("div");
        optionsContainer.className = "options-container";

        menuData[menuKey].forEach(option => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.innerText = option.text;
            btn.onclick = () => handleOptionClick(option);
            optionsContainer.appendChild(btn);
        });

        chatMessages.appendChild(optionsContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleOptionClick(option) {
        // Find and remove the most recent options container
        const containers = document.querySelectorAll(".options-container");
        if (containers.length > 0) {
            containers[containers.length - 1].remove();
        }

        // Show user choice
        appendMsg(option.text, "user");

        // Robot Face Animation
        hMouth.style.height = "8px";

        setTimeout(() => {
            hMouth.style.height = "3px";
            if (option.next) {
                showMenu(option.next);
            } else if (option.ans) {
                appendMsg(option.ans, "bot");
                showMenu("main", "Anything else I can help with?");
            }
        }, 600);
    }

    // Manual input fallback
    function sendMessage() {
        const text = chatText.value.trim();
        if (!text) return;
        appendMsg(text, "user");
        chatText.value = "";
        
        hMouth.style.height = "8px";
        setTimeout(() => {
            hMouth.style.height = "3px";
            appendMsg("I'm not sure about that. Please select an option or contact support.", "bot");
            showMenu("contact");
        }, 1000);
    }

    sendBtn.onclick = sendMessage;
    chatText.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
});


// Onboarding Tour Implementation
document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("onboarding-overlay");
    const spotlight = document.getElementById("onboarding-spotlight");
    const pointer = document.getElementById("onboarding-pointer");
    const nextBtn = document.getElementById("onboarding-next-btn");
    const skipBtn = document.getElementById("onboarding-skip-btn");
    const title = document.getElementById("onboarding-title");
    const text = document.getElementById("onboarding-text");
    const icon = document.getElementById("onboarding-icon");

    if (!overlay) return;

    const steps = [
        { title: "Home", text: "Buy amazing second-hand products here.", icon: "fa-house", target: ".navbar-center li:nth-child(1)" },
        { title: "Sell", text: "Turn your old devices into cash.", icon: "fa-tag", target: ".navbar-center li:nth-child(2)" },
        { title: "Repair", text: "Professional repair for your devices.", icon: "fa-screwdriver-wrench", target: ".navbar-center li:nth-child(3)" },
        { title: "My Orders", text: "View and track your purchases.", icon: "fa-box", target: ".navbar-center li:nth-child(4)" },
        { title: "Me", text: "Manage your account and profile.", icon: "fa-user", target: ".navbar-center li:nth-child(5)" },
        { title: "Cart", text: "Items ready for checkout.", icon: "fa-cart-shopping", target: ".navbar-right a:nth-child(1)" },
        { title: "Wishlist", text: "Products you saved for later.", icon: "fa-heart", target: ".navbar-right a:nth-child(2)" },
        { title: "Chatbox", text: "Ask us anything!", icon: "fa-comments", target: "#chat-button" }
    ];

    let currentStep = 0;

    function moveStep() {
        const step = steps[currentStep];
        let targetEl = document.querySelector(step.target);

        // Mobile Check: If on mobile, point to bottom nav instead
        if (window.innerWidth <= 768) {
            if (currentStep < 5) {
                targetEl = document.querySelectorAll(".mobile-bottom-nav .nav-item")[currentStep];
            } else if (currentStep < 7) {
                targetEl = document.querySelectorAll(".mobile-topbar .mobile-right a")[currentStep - 5];
            }
        }

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const pad = 8;

            // Move Spotlight
            spotlight.style.width = `${rect.width + pad * 2}px`;
            spotlight.style.height = `${rect.height + pad * 2}px`;
            spotlight.style.left = `${rect.left - pad}px`;
            spotlight.style.top = `${rect.top - pad}px`;

            // Move Arrow (Points UP if target is at top, Points DOWN if target is at bottom)
            pointer.style.left = `${rect.left + rect.width / 2}px`;
            if (rect.top > window.innerHeight / 2) {
                pointer.style.top = `${rect.top - 50}px`;
                pointer.style.transform = "translateX(-50%) rotate(180deg)";
            } else {
                pointer.style.top = `${rect.bottom + 10}px`;
                pointer.style.transform = "translateX(-50%) rotate(0deg)";
            }

            // Update Card
            title.innerText = step.title;
            text.innerText = step.text;
            icon.className = `fa-solid ${step.icon}`;
        }
        
        if (currentStep === steps.length - 1) nextBtn.innerText = "Done!";
    }

    nextBtn.onclick = () => {
        currentStep++;
        if (currentStep < steps.length) {
            moveStep();
        } else {
            overlay.style.display = "none";
            fetch('/clear_onboarding');
        }
    };

    skipBtn.onclick = () => {
        overlay.style.display = "none";
        fetch('/clear_onboarding');
    };

    moveStep(); // Start
});

const searchInput = document.getElementById("liveSearch");
const resultsBox = document.getElementById("searchResults");

searchInput.addEventListener("input", async () => {
    let query = searchInput.value;

    if (query.length < 1) {
        resultsBox.innerHTML = "";
        return;
    }

    let res = await fetch(`/api/search?q=${query}`);
    let data = await res.json();

    resultsBox.innerHTML = "";

    data.forEach(product => {

        let image = product.image 
        ? `/static/uploads/${product.image}` 
        : "/static/image/no-image.png";

        let html = `
        <a href="/product/${product.id}" class="search-item">
            <img src="${image}" class="search-img">
            <div class="search-info">
                <h4>${product.name}</h4>
                <p>${product.brand}</p>
                <span>₹${product.price}</span>
            </div>
        </a>
        `;

        resultsBox.innerHTML += html;
    });
});