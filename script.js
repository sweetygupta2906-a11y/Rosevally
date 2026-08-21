/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   POS Terminal & Billing Controller (script.js)
   ========================================================================== */

(function() {
    'use strict';

    // State Variables
    let cart = [];
    let activeCategory = 'all';
    let activeDiet = 'all';
    let searchQuery = '';
    let selectedOrderType = 'dinein'; // dinein, takeaway, delivery
    let selectedPaymentMode = 'Cash';
    let editingItemIndexForNote = null;

    // DOM Elements
    let foodGrid, cartList, posTableSelect, posGuestName;
    let summarySubtotal, summaryDiscount, summaryGST, summaryGrandTotal;
    let discountSelect, tablePickerWrapper;

    // Initialize POS
    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupEventListeners();
        loadTablesIntoSelect();
        renderFoodMenu();
        updateLiveBadges();
        startLiveClock();
        checkPreselectedTable();
    });

    function cacheDOMElements() {
        foodGrid = document.getElementById('foodGrid');
        cartList = document.getElementById('cartItemsList');
        posTableSelect = document.getElementById('posTableSelect');
        posGuestName = document.getElementById('posGuestName');
        summarySubtotal = document.getElementById('summarySubtotal');
        summaryDiscount = document.getElementById('summaryDiscount');
        summaryGST = document.getElementById('summaryGST');
        summaryGrandTotal = document.getElementById('summaryGrandTotal');
        discountSelect = document.getElementById('discountSelect');
        tablePickerWrapper = document.getElementById('tablePickerWrapper');
    }

    function setupEventListeners() {
        // Search Input
        const searchInput = document.getElementById('foodSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.toLowerCase().trim();
                renderFoodMenu();
            });
        }

        // Diet Buttons (All, Veg, Non-Veg)
        document.querySelectorAll('.diet-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.diet-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeDiet = this.getAttribute('data-diet');
                renderFoodMenu();
            });
        });

        // Category Chips
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                activeCategory = this.getAttribute('data-cat');
                renderFoodMenu();
            });
        });

        // Order Type Switch (Dine-in, Takeaway, Delivery)
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedOrderType = this.getAttribute('data-type');
                
                if (selectedOrderType === 'dinein') {
                    if (tablePickerWrapper) tablePickerWrapper.style.display = 'block';
                } else {
                    if (tablePickerWrapper) tablePickerWrapper.style.display = 'none';
                }
            });
        });

        // Payment Mode Buttons
        document.querySelectorAll('.pay-mode-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.pay-mode-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedPaymentMode = this.getAttribute('data-mode');
            });
        });

        // Listen for Central Store Updates
        window.addEventListener('rosevally_update', function() {
            loadTablesIntoSelect();
            updateLiveBadges();
        });
    }

    // Check if user came from Tables page with a preselected table
    function checkPreselectedTable() {
        const preselected = RoseStore.getActivePosTable();
        if (preselected && posTableSelect) {
            posTableSelect.value = preselected;
            RoseStore.clearActivePosTable();
            RoseStore.showToast(`Table selected: ${preselected}`, 'info');
        }
    }

    // Populate Table Select with Live Status
    function loadTablesIntoSelect() {
        if (!posTableSelect) return;
        const currentVal = posTableSelect.value;
        const tables = RoseStore.getTables();

        posTableSelect.innerHTML = '<option value="">Select Table...</option>';
        tables.forEach(t => {
            const statusEmoji = t.status === 'available' ? '🟢' : t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🔵';
            const option = document.createElement('option');
            option.value = t.name;
            option.textContent = `${statusEmoji} ${t.name} (${t.section.split(' ')[0]} - ${t.capacity}p)`;
            if (t.name === currentVal) option.selected = true;
            posTableSelect.appendChild(option);
        });
    }

    // Render Food Menu Cards
    function renderFoodMenu() {
        if (!foodGrid) return;
        const menu = RoseStore.getMenu();

        const filtered = menu.filter(item => {
            if (!item.available) return false;
            
            // Category Match
            const catMatch = (activeCategory === 'all') || (item.category.toLowerCase() === activeCategory.toLowerCase());
            
            // Diet Match
            const dietMatch = (activeDiet === 'all') || (item.type.toLowerCase() === activeDiet.toLowerCase());
            
            // Search Match
            const searchMatch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery) || 
                (item.description && item.description.toLowerCase().includes(searchQuery));

            return catMatch && dietMatch && searchMatch;
        });

        if (filtered.length === 0) {
            foodGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; color:#94a3b8;">
                    <div style="font-size:40px; margin-bottom:10px;">🔍</div>
                    <h3>No food items found</h3>
                    <p style="font-size:13px;">Try selecting another category or clearing your search.</p>
                </div>
            `;
            return;
        }

        foodGrid.innerHTML = filtered.map(item => `
            <div class="food-card" onclick="RosePOS.addToCart(${item.id})">
                <div class="card-badge-row">
                    <span class="${item.type === 'veg' ? 'veg-badge' : 'nonveg-badge'}" title="${item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                    <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">${item.category}</span>
                </div>
                <div class="food-emoji-large">${item.emoji || '🍽️'}</div>
                <h3>${item.name}</h3>
                <p>${item.description || 'Freshly prepared signature dish'}</p>
                <div class="card-footer">
                    <span class="food-price">₹${Number(item.price).toFixed(2)}</span>
                    <button type="button" class="add-food-btn">+ Add</button>
                </div>
            </div>
        `).join('');
    }

    // Cart Management
    window.RosePOS = {
        addToCart: function(itemId) {
            const menu = RoseStore.getMenu();
            const product = menu.find(m => m.id === itemId);
            if (!product) return;

            const existingIndex = cart.findIndex(c => c.id === itemId);
            if (existingIndex > -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    type: product.type,
                    emoji: product.emoji,
                    quantity: 1,
                    note: ''
                });
            }

            renderCart();
            RoseStore.playSound('chime');
        },

        updateQty: function(index, delta) {
            if (cart[index]) {
                cart[index].quantity += delta;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
                renderCart();
            }
        },

        removeItem: function(index) {
            if (cart[index]) {
                cart.splice(index, 1);
                renderCart();
            }
        },

        openNoteModal: function(index) {
            editingItemIndexForNote = index;
            const item = cart[index];
            if (!item) return;

            document.getElementById('noteModalItemTitle').textContent = `Note for: ${item.name}`;
            document.getElementById('customItemNoteInput').value = item.note || '';
            document.getElementById('itemNoteModal').classList.add('active');
        }
    };

    function renderCart() {
        if (!cartList) return;

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div class="empty-cart-state">
                    <span>🛒</span>
                    <strong>Order Cart is Empty</strong>
                    <p>Click any item on the left to add to order</p>
                </div>
            `;
            calculateCartTotals();
            return;
        }

        cartList.innerHTML = cart.map((item, index) => `
            <div class="cart-item-row">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-rate">₹${item.price.toFixed(2)} each</div>
                    ${item.note ? `<div class="item-note-tag" onclick="RosePOS.openNoteModal(${index})" style="cursor:pointer;" title="Edit note">📝 ${item.note}</div>` : `<button onclick="RosePOS.openNoteModal(${index})" style="background:none; border:none; color:#6366f1; font-size:11px; font-weight:600; cursor:pointer; padding:0; margin-top:2px;">+ Add Note</button>`}
                </div>

                <div class="qty-stepper">
                    <button class="qty-btn" onclick="RosePOS.updateQty(${index}, -1)">−</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="RosePOS.updateQty(${index}, 1)">+</button>
                </div>

                <div class="item-total">₹${(item.price * item.quantity).toFixed(2)}</div>
                
                <button class="item-remove-btn" onclick="RosePOS.removeItem(${index})" title="Remove item">🗑️</button>
            </div>
        `).join('');

        calculateCartTotals();
    }

    // Total & Tax Calculations
    window.calculateCartTotals = function() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let discountAmount = 0;
        const discountVal = discountSelect ? discountSelect.value : '0';
        if (discountVal.includes('%')) {
            const pct = parseFloat(discountVal) / 100;
            discountAmount = subtotal * pct;
        } else {
            discountAmount = Math.min(parseFloat(discountVal) || 0, subtotal);
        }

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const gst = discountedSubtotal * 0.05; // 5% GST
        const grandTotal = discountedSubtotal + gst;

        if (summarySubtotal) summarySubtotal.textContent = `₹${subtotal.toFixed(2)}`;
        if (summaryDiscount) summaryDiscount.textContent = `- ₹${discountAmount.toFixed(2)}`;
        if (summaryGST) summaryGST.textContent = `₹${gst.toFixed(2)}`;
        if (summaryGrandTotal) summaryGrandTotal.textContent = `₹${grandTotal.toFixed(2)}`;

        return { subtotal, discount: discountAmount, gst, grandTotal };
    };

    // Item Note Modal Helpers
    window.closeNoteModal = function() {
        document.getElementById('itemNoteModal').classList.remove('active');
        editingItemIndexForNote = null;
    };

    window.saveItemNote = function() {
        if (editingItemIndexForNote !== null && cart[editingItemIndexForNote]) {
            const noteText = document.getElementById('customItemNoteInput').value.trim();
            cart[editingItemIndexForNote].note = noteText;
            renderCart();
        }
        closeNoteModal();
    };

    // Reset Order
    window.resetCurrentOrder = function() {
        if (cart.length > 0 && !confirm("Clear current cart items?")) return;
        cart = [];
        if (posGuestName) posGuestName.value = '';
        if (posTableSelect) posTableSelect.value = '';
        if (discountSelect) discountSelect.value = '0';
        renderCart();
        RoseStore.showToast("Cart cleared", "info");
    };

    // Send Kitchen Order Ticket (KOT)
    window.sendKitchenKOT = function() {
        if (cart.length === 0) {
            RoseStore.showToast("Please add items to cart before sending KOT!", "warning");
            return;
        }

        if (selectedOrderType === 'dinein' && (!posTableSelect || !posTableSelect.value)) {
            RoseStore.showToast("Please select a table for Dine-In order!", "warning");
            posTableSelect.focus();
            return;
        }

        const totals = calculateCartTotals();
        const orderData = {
            orderType: selectedOrderType,
            tableNumber: selectedOrderType === 'dinein' ? posTableSelect.value : (selectedOrderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
            customerName: posGuestName && posGuestName.value ? posGuestName.value : 'Walk-in Guest',
            customerPhone: '',
            items: JSON.parse(JSON.stringify(cart)),
            subtotal: totals.subtotal,
            discount: totals.discount,
            gst: totals.gst,
            grandTotal: totals.grandTotal,
            paymentMethod: selectedPaymentMode,
            paymentStatus: 'Pending',
            orderStatus: 'Pending'
        };

        const created = RoseStore.createOrder(orderData);
        RoseStore.showToast(`KOT Sent to Kitchen! Order #${created.orderNumber}`, 'success');
        
        // Reset cart for next order
        cart = [];
        if (posGuestName) posGuestName.value = '';
        if (posTableSelect) posTableSelect.value = '';
        renderCart();
    };

    // Settle & Print Bill
    window.generateAndPrintBill = function() {
        if (cart.length === 0) {
            RoseStore.showToast("Cart is empty! Add items first.", "warning");
            return;
        }

        if (selectedOrderType === 'dinein' && (!posTableSelect || !posTableSelect.value)) {
            RoseStore.showToast("Please select a table for Dine-In order!", "warning");
            posTableSelect.focus();
            return;
        }

        const totals = calculateCartTotals();

        // If UPI payment selected, show QR modal first
        if (selectedPaymentMode === 'UPI') {
            document.getElementById('upiAmountDisplay').textContent = `Amount: ₹${totals.grandTotal.toFixed(2)}`;
            document.getElementById('upiModal').classList.add('active');
            return;
        }

        finalizeAndShowReceipt();
    };

    window.closeUpiModal = function() {
        document.getElementById('upiModal').classList.remove('active');
    };

    window.confirmUpiPayment = function() {
        closeUpiModal();
        RoseStore.showToast("UPI Payment verified successfully!", "success");
        finalizeAndShowReceipt();
    };

    function finalizeAndShowReceipt() {
        const totals = calculateCartTotals();
        const orderData = {
            orderType: selectedOrderType,
            tableNumber: selectedOrderType === 'dinein' ? posTableSelect.value : (selectedOrderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
            customerName: posGuestName && posGuestName.value ? posGuestName.value : 'Walk-in Guest',
            customerPhone: '',
            items: JSON.parse(JSON.stringify(cart)),
            subtotal: totals.subtotal,
            discount: totals.discount,
            gst: totals.gst,
            grandTotal: totals.grandTotal,
            paymentMethod: selectedPaymentMode,
            paymentStatus: 'Paid',
            orderStatus: 'Served'
        };

        const order = RoseStore.createOrder(orderData);

        // Populate Receipt Modal
        document.getElementById('rcptOrderNo').textContent = `Order: #${order.orderNumber}`;
        document.getElementById('rcptDate').textContent = new Date().toLocaleString();
        document.getElementById('rcptType').textContent = `${order.orderType.toUpperCase()} (${order.tableNumber})`;
        document.getElementById('rcptGuest').textContent = `Guest: ${order.customerName}`;
        document.getElementById('rcptSubtotal').textContent = `₹${order.subtotal.toFixed(2)}`;
        document.getElementById('rcptDiscount').textContent = `- ₹${order.discount.toFixed(2)}`;
        document.getElementById('rcptGst').textContent = `₹${order.gst.toFixed(2)}`;
        document.getElementById('rcptGrandTotal').textContent = `₹${order.grandTotal.toFixed(2)}`;
        document.getElementById('rcptPayMode').textContent = order.paymentMethod;

        const itemsTbody = document.getElementById('rcptItemsBody');
        itemsTbody.innerHTML = order.items.map(i => `
            <tr>
                <td>${i.name} ${i.note ? `<br><small style="color:#666;">*${i.note}</small>` : ''}</td>
                <td style="text-align:center;">${i.quantity}</td>
                <td style="text-align:right;">₹${(i.price * i.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        // Show Modal
        document.getElementById('receiptModal').classList.add('active');

        // Clear cart for next order
        cart = [];
        if (posGuestName) posGuestName.value = '';
        if (posTableSelect) posTableSelect.value = '';
        renderCart();
    }

    window.closeReceiptModal = function() {
        document.getElementById('receiptModal').classList.remove('active');
    };

    window.printReceipt = function() {
        window.print();
    };

    // Live Badges
    function updateLiveBadges() {
        const tables = RoseStore.getTables();
        const occupiedCount = tables.filter(t => t.status === 'occupied').length;
        const tableBadge = document.getElementById('tableOccupiedBadge');
        if (tableBadge) tableBadge.textContent = `${occupiedCount}/${tables.length}`;

        const orders = RoseStore.getOrders();
        const pendingKitchen = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing').length;
        const kitchenBadge = document.getElementById('kitchenOrdersBadge');
        if (kitchenBadge) {
            kitchenBadge.textContent = pendingKitchen;
            kitchenBadge.style.display = pendingKitchen > 0 ? 'inline-block' : 'none';
        }
    }

    // Live Clock
    function startLiveClock() {
        const clockEl = document.getElementById('liveClockDisplay');
        if (!clockEl) return;
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
            clockEl.innerHTML = `🕒 <span>${dateStr}, ${timeStr}</span>`;
        };
        update();
        setInterval(update, 1000);
    }

})();