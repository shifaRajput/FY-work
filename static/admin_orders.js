let currentOrderId = null;
let targetStatus = null; // Keeps track of which specific button was clicked

document.addEventListener("DOMContentLoaded", function() {
    fetchAdminOrders();
});

function fetchAdminOrders() {
    const ordersList = document.getElementById('admin-orders-list');
    const loadingDiv = document.getElementById('loading');
    const noOrdersDiv = document.getElementById('no-orders');
    
    ordersList.innerHTML = '';
    if(loadingDiv) loadingDiv.style.display = 'none';
    if(noOrdersDiv) noOrdersDiv.style.display = 'none';

    fetch('/api/admin/orders')
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(orders => {
            if (orders.length === 0 || orders.error) {
                if(noOrdersDiv) noOrdersDiv.style.display = 'block';
                return;
            }
            
            orders.forEach(order => {
                // Determine which buttons should be disabled based on current status
                let packedDisabled = true, shippedDisabled = true, outDisabled = true;
                
                if (order.status === 'Order Placed') {
                    packedDisabled = false;
                } else if (order.status === 'Packed') {
                    shippedDisabled = false;
                } else if (order.status === 'Shipped') {
                    outDisabled = false;
                }
                
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.innerHTML = `
                    <div class="order-details">
                        <div class="card-header">
                            <h3 class="product-name">Order #${order.order_id}</h3>
                            <span class="status-badge">${order.status}</span>
                        </div>
                        <p class="order-info"><strong>Product:</strong> ${order.product_name}</p>
                        <p class="order-info"><strong>Customer:</strong> ${order.customer_name} (User ID: ${order.user_id || 'N/A'})</p>
                        <p class="order-info"><strong>Total:</strong> ₹${order.total_price.toLocaleString('en-IN')}</p>
                    </div>
                    <div class="order-actions-row">
                        <button class="btn-action btn-packed ${packedDisabled ? 'disabled' : ''}" 
                            ${packedDisabled ? 'disabled' : ''} 
                            onclick="openModal(${order.order_id}, 'Packed')">Packed</button>
                            
                        <button class="btn-action btn-shipped ${shippedDisabled ? 'disabled' : ''}" 
                            ${shippedDisabled ? 'disabled' : ''} 
                            onclick="openModal(${order.order_id}, 'Shipped')">Shipped</button>
                            
                        <button class="btn-action btn-out ${outDisabled ? 'disabled' : ''}" 
                            ${outDisabled ? 'disabled' : ''} 
                            onclick="openModal(${order.order_id}, 'Out for Delivery')">Out for Delivery</button>
                    </div>`;
                ordersList.appendChild(orderCard);
            });
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            if(loadingDiv) loadingDiv.style.display = 'block';
        });
}

function openModal(orderId, status) {
    currentOrderId = orderId;
    targetStatus = status; // Save the status they clicked
    document.getElementById('modal-message').innerText = `Update Order #${orderId} status to '${status}'?`;
    document.getElementById('custom-modal').classList.add('active');
}

function closeModal() {
    currentOrderId = null;
    targetStatus = null;
    document.getElementById('custom-modal').classList.remove('active');
}

document.getElementById('confirm-advance-btn').addEventListener('click', function() {
    if (!currentOrderId || !targetStatus) return;
    
    // Send the specific status to the backend using JSON
    fetch(`/api/admin/update-status/${currentOrderId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
    })
    .then(response => response.json())
    .then(data => {
        closeModal();
        if (data.success) {
            fetchAdminOrders(); // Refresh table so the button becomes disabled
        } else {
            console.error("Backend error:", data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        closeModal();
    });
});