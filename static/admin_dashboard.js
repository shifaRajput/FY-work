document.addEventListener("DOMContentLoaded", function () {

    // 1. Safely handle tab switching
    const tabItems = document.querySelectorAll(".tab-item");
    const adminSections = document.querySelectorAll(".admin-section");

    tabItems.forEach((item) => {
        item.addEventListener("click", () => {
            // Remove active class from all nav items
            document.querySelectorAll(".admin-nav-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Hide all sections
            adminSections.forEach(section => section.classList.remove("active"));
            
            // Show the specific target section linked to this tab
            const targetId = item.getAttribute("data-target");
            document.getElementById(targetId).classList.add("active");
        });
    });

    // 2. NEW: Auto-open Products tab if coming from another page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'products') {
        const productsTab = document.querySelector('[data-target="products-section"]');
        if (productsTab) {
            productsTab.click(); // Virtually clicks the products tab for you!
        }
    }

    // 3. DELETE CONFIRMATION
    const deleteButtons = document.querySelectorAll(".delete-btn");

    deleteButtons.forEach(button => {
        button.addEventListener("click", function () {
            const productId = this.getAttribute("data-id");
            const confirmDelete = confirm("Are you sure you want to delete this product?");

            if (confirmDelete) {
                fetch("/admin/delete/" + productId, {
                    method: "POST"
                })
                .then(response => {
                    if (response.ok) {
                        window.location.reload();
                    }
                });
            }
        });
    });

});