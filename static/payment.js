/* ─────────────────────────────────────────────
   payment.js  –  handles Buy Now + Cart flows
   ───────────────────────────────────────────── */

   let orders       = [];
   let selectedPay  = '';
   let pendingTotal = 0;
   
   // Detect Buy Now mode: a product_id embedded by the Jinja template
   // payment.html should contain:  <div id="buyNowMeta" data-product-id="{{ product_id or '' }}"></div>
   const metaEl     = document.getElementById('buyNowMeta');
   const PRODUCT_ID = metaEl ? parseInt(metaEl.dataset.productId) || null : null;
   const IS_BUY_NOW = !!PRODUCT_ID;
   
   // ─── Init ──────────────────────────────────────────────────────────────────────
   document.addEventListener('DOMContentLoaded', () => {
     if (IS_BUY_NOW) {
       fetchBuyNowProduct();
     } else {
       fetchOrders();           // Cart checkout flow
     }
   
     // Card number formatter  → "1234 5678 9012 3456"
     document.getElementById('cardNumber').addEventListener('input', function () {
       let v = this.value.replace(/\D/g, '').substring(0, 16);
       this.value = v.replace(/(.{4})/g, '$1 ').trim();
     });
   
     // Expiry formatter  →  "MM/YY"
     document.getElementById('expiry').addEventListener('input', function () {
       let v = this.value.replace(/\D/g, '').substring(0, 4);
       this.value = v.length > 2 ? v.substring(0, 2) + '/' + v.substring(2) : v;
     });
   });
   
   
   // ─── BUY NOW: load single product ─────────────────────────────────────────────
   async function fetchBuyNowProduct() {
     try {
       const res  = await fetch(`/api/get-product/${PRODUCT_ID}`);
       const data = await res.json();
   
       if (!data.success) { showToast('Product not found.', 'error'); return; }
   
       const p = data.product;
       pendingTotal = p.real_price;
   
       // Populate nav / summary
       const userNameEl = document.getElementById('navUserName');
       if (userNameEl) userNameEl.textContent = '';   // filled server-side via template
   
       document.getElementById('bagCount').textContent          = '1';
       document.getElementById('summaryItemsLabel').textContent = 'Items (1)';
       document.getElementById('summaryItemsAmt').textContent   = fmt(pendingTotal);
       document.getElementById('summaryTotal').textContent      = fmt(pendingTotal);
       document.getElementById('payBtnAmount').textContent      = fmt(pendingTotal);
   
       // Render single product row
       const el = document.getElementById('orderItemsList');
       el.innerHTML = `
         <div class="order-item">
           <div class="item-img">📦</div>
           <div class="item-info">
             <div class="item-name">${esc(p.name)}</div>
             <div class="item-desc">${esc(p.brand || '')}${p.grade ? ' · ' + esc(p.grade) : ''} · Qty: 1</div>
           </div>
           <div class="item-price">${fmt(p.real_price)}</div>
         </div>`;
     } catch (e) {
       showToast('Could not load product details.', 'error');
     }
   }
   
   
   // ─── CART: load pending orders ────────────────────────────────────────────────
   async function fetchOrders() {
     try {
       const res  = await fetch('/api/my-orders');
       if (res.status === 401) { window.location.href = '/'; return; }
       const data = await res.json();
   
       orders       = data.orders.filter(o => o.status === 'pending');
       pendingTotal = orders.reduce((s, o) => s + o.total_price, 0);
   
       document.getElementById('navUserName').textContent        = data.username;
       document.getElementById('bagCount').textContent           = orders.length;
       document.getElementById('summaryItemsLabel').textContent  = `Items (${orders.length})`;
       document.getElementById('summaryItemsAmt').textContent    = fmt(pendingTotal);
       document.getElementById('summaryTotal').textContent       = fmt(pendingTotal);
       document.getElementById('payBtnAmount').textContent       = fmt(pendingTotal);
   
       renderOrderItems();
     } catch (e) {
       showToast('Could not load orders.', 'error');
     }
   }
   
   function renderOrderItems() {
     const el = document.getElementById('orderItemsList');
     if (!orders.length) {
       el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">No pending orders.</p>';
       return;
     }
     el.innerHTML = orders.map(o => `
       <div class="order-item">
         <div class="item-img">📦</div>
         <div class="item-info">
           <div class="item-name">${esc(o.product_name)}</div>
           <div class="item-desc">${esc(o.product_brand || '')}${o.grade ? ' · ' + esc(o.grade) : ''} · Qty: ${o.quantity}</div>
         </div>
         <div class="item-price">${fmt(o.real_price || o.total_price)}</div>
       </div>`).join('');
   }
   
   
   // ─── Step navigation ──────────────────────────────────────────────────────────
   function goToStep(n) {
     document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
     const target = document.getElementById(`stepContent${n}`) ||
                    document.getElementById('stepContentSuccess');
     target.classList.add('active');
   
     [1, 2, 3].forEach(i => {
       const s = document.getElementById(`step${i}indicator`);
       s.classList.remove('active', 'done');
       if (i < n) s.classList.add('done');
       if (i === n) s.classList.add('active');
     });
   
     document.getElementById('line1').classList.toggle('done', n > 1);
     document.getElementById('line2').classList.toggle('done', n > 2);
     window.scrollTo({ top: 0, behavior: 'smooth' });
   }
   
   function goToStep2() {
     if (!validateAddress()) return;
     const landmark = v('landmark');
     const addr = `${v('house')}, ${v('road')}${landmark ? ', ' + landmark : ''}, ${v('city')}, ${v('state')} - ${v('pincode')}`;
     document.getElementById('addressPreview').innerHTML =
       `<strong>${esc(v('fullName'))} &nbsp;·&nbsp; ${v('phone')}</strong>${esc(addr)}`;
     goToStep(2);
   }
   
   function goToStep3() {
     if (!IS_BUY_NOW && !orders.length) { showToast('No pending orders to pay.', 'error'); return; }
     goToStep(3);
   }
   
   
   // ─── Address validation ───────────────────────────────────────────────────────
   function validateAddress() {
     let ok = true;
     const fields = [
       { id: 'fullName', err: 'errFullName', msg: 'Full name is required' },
       { id: 'phone',    err: 'errPhone',    msg: 'Valid 10-digit number required', fn: x => /^\d{10}$/.test(x) },
       { id: 'house',    err: 'errHouse',    msg: 'House/Flat no. is required' },
       { id: 'road',     err: 'errRoad',     msg: 'Road/Area is required' },
       { id: 'city',     err: 'errCity',     msg: 'City is required' },
       { id: 'state',    err: 'errState',    msg: 'State is required' },
       { id: 'pincode',  err: 'errPincode',  msg: 'Valid 6-digit pincode required', fn: x => /^\d{6}$/.test(x) },
     ];
     fields.forEach(f => {
       const val   = v(f.id);
       const valid = f.fn ? f.fn(val) : val.trim() !== '';
       document.getElementById(f.err).textContent = valid ? '' : f.msg;
       document.getElementById(f.id).classList.toggle('error', !valid);
       if (!valid) ok = false;
     });
     return ok;
   }
   
   
   // ─── Payment option selection ─────────────────────────────────────────────────
   function selectPayment(method, labelEl) {
     selectedPay = method;
     document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
     labelEl.classList.add('selected');
     document.getElementById('cardFields').classList.toggle('visible', method === 'card');
     document.getElementById('codNote').classList.toggle('visible',   method === 'cod');
     labelEl.querySelector('input[type="radio"]').checked = true;
   }
   
   
   // ─── Submit payment ───────────────────────────────────────────────────────────
   async function submitPayment() {
     if (!selectedPay) { showToast('Please select a payment method.', 'error'); return; }
   
     const btn = document.getElementById('payBtn');
     btn.disabled  = true;
     btn.textContent = 'Processing…';
   
     const landmark    = v('landmark');
     const fullAddress = `${v('house')}, ${v('road')}${landmark ? ', ' + landmark : ''}, ${v('city')}, ${v('state')} - ${v('pincode')}`;
     const phoneNum    = v('phone');
   
     let success = false;
   
     if (IS_BUY_NOW) {
       // ── Buy Now: single API call, order created server-side ──────────────────
       try {
         const res = await fetch('/api/pay-now', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             product_id: PRODUCT_ID,
             quantity:   1,
             payMethod:  selectedPay,
             address:    fullAddress,
             phone:      phoneNum,
           }),
         });
         const data = await res.json();
         success = data.success === true;
       } catch { /* handled below */ }
     } else {
       // ── Cart: pay each pending order individually ─────────────────────────────
       if (!orders.length) { showToast('No orders to pay.', 'error'); return; }
       let count = 0;
       for (const o of orders) {
         try {
           const res = await fetch(`/api/pay/${o.order_id}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ payMethod: selectedPay, address: fullAddress, phone: phoneNum }),
           });
           if (res.ok) count++;
         } catch { /* continue */ }
       }
       success = count > 0;
     }
   
     btn.disabled = false;
     btn.innerHTML = `Pay <span id="payBtnAmount">${fmt(pendingTotal)}</span>`;
   
     if (success) {
       const label = payLabel(selectedPay);
       document.getElementById('successMsg').textContent =
         `Order placed via ${label}. Total: ${fmt(pendingTotal)}`;
   
       document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
       document.getElementById('stepContentSuccess').classList.add('active');
   
       setTimeout(() => { window.location.href = '/myorders'; }, 3000);
     } else {
       showToast('Payment failed. Please try again.', 'error');
     }
   }
   
   
   // ─── Helpers ─────────────────────────────────────────────────────────────────
   const v        = id => document.getElementById(id)?.value || '';
   const fmt      = n  => '₹' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
   const esc      = s  => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const payLabel = m  => ({ gpay: 'Google Pay', card: 'Credit/Debit Card', cod: 'Cash on Delivery' }[m] || m);
   
   let toastT;
   function showToast(msg, type = 'success') {
     const t = document.getElementById('toast');
     t.textContent = msg;
     t.className   = `show ${type}`;
     clearTimeout(toastT);
     toastT = setTimeout(() => (t.className = ''), 3000);
   }