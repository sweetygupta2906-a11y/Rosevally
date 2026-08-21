/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Order History & Tracking Controller (orders.js)
   ========================================================================== */

(function() {
    'use strict';

    let searchQuery = '';
    let statusFilter = 'all';
    let typeFilter = 'all';
    let paymentFilter = 'all';
    let currentSelectedOrder = null;

    let ordersTableBody;
    let kpiTotalOrders, kpiTotalRevenue, kpiActiveOrders, kpiDineInCount;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupFilterListeners();
        renderOrdersTable();
        updateKPIs();

        window.addEventListener('rosevally_update', function() {
            renderOrdersTable();
            updateKPIs();
        });
    });

    function cacheDOMElements() {
        ordersTableBody = document.getElementById('ordersTableBody');
        kpiTotalOrders = document.getElementById('kpiTotalOrders');
        kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
        kpiActiveOrders = document.getElementById('kpiActiveOrders');
        kpiDineInCount = document.getElementById('kpiDineInCount');
    }

    function setupFilterListeners() {
        // Search Input
        const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.toLowerCase().trim();
                renderOrdersTable();
            });
        }

        // Status Filter
        const statusSelect = document.getElementById('filterOrderStatus');
        if (statusSelect) {
            statusSelect.addEventListener('change', function(e) {
                statusFilter = e.target.value;
                renderOrdersTable();
            });
        }

        // Type Filter
        const typeSelect = document.getElementById('filterOrderType');
        if (typeSelect) {
            typeSelect.addEventListener('change', function(e) {
                typeFilter = e.target.value;
                renderOrdersTable();
            });
        }

        // Payment Filter
        const paySelect = document.getElementById('filterPaymentMethod');
        if (paySelect) {
            paySelect.addEventListener('change', function(e) {
                paymentFilter = e.target.value;
                renderOrdersTable();
            });
        }
    }

    function renderOrdersTable() {
        if (!ordersTableBody) return;
        const orders = RoseStore.getOrders();

        const filtered = orders.filter(o => {
            // Status Match
            const sMatch = (statusFilter === 'all') || (o.orderStatus === statusFilter);

            // Type Match
            const tMatch = (typeFilter === 'all') || (o.orderType === typeFilter);

            // Payment Match
            const pMatch = (paymentFilter === 'all') || (o.paymentMethod === paymentFilter);

            // Search Match
            const orderIdStr = String(o.orderNumber || o.id || '');
            const custStr = String(o.customerName || '').toLowerCase();
            const tableStr = String(o.tableNumber || '').toLowerCase();
            const searchMatch = !searchQuery || 
                orderIdStr.includes(searchQuery) || 
                custStr.includes(searchQuery) || 
                tableStr.includes(searchQuery);

            return sMatch && tMatch && pMatch && searchMatch;
        });

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:50px 20px; color:#94a3b8;">
                        <div style="font-size:36px; margin-bottom:8px;">📋</div>
                        <strong>No matching orders found</strong>
                        <p style="font-size:12px;">Try adjusting your search criteria or filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        ordersTableBody.innerHTML = filtered.map(o => {
            const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
            
            const badgeClass = o.orderStatus === 'Pending' ? 'badge-pending' :
                              o.orderStatus === 'Preparing' ? 'badge-preparing' :
                              o.orderStatus === 'Ready' ? 'badge-ready' :
                              o.orderStatus === 'Served' ? 'badge-served' : 'badge-cancelled';

            const itemsSummary = o.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ') + 
                (o.items.length > 2 ? ` (+${o.items.length - 2} more)` : '');

            return `
                <tr>
                    <td><strong>#${o.orderNumber}</strong></td>
                    <td>
                        <span style="font-weight:600;">${timeStr}</span><br>
                        <small style="color:var(--text-muted);">${dateStr}</small>
                    </td>
                    <td>
                        <strong>${o.orderType.toUpperCase()}</strong><br>
                        <small style="color:var(--text-secondary);">${o.tableNumber}</small>
                    </td>
                    <td>
                        <span>${o.customerName || 'Walk-in'}</span>
                        ${o.customerPhone ? `<br><small style="color:var(--text-muted);">${o.customerPhone}</small>` : ''}
                    </td>
                    <td style="max-width:220px; color:var(--text-secondary);">
                        ${itemsSummary}
                    </td>
                    <td>
                        <strong style="color:var(--primary); font-size:14px;">₹${o.grandTotal.toFixed(2)}</strong>
                    </td>
                    <td>
                        <span style="font-weight:600;">${o.paymentMethod}</span><br>
                        <small style="color:${o.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}; font-weight:700;">● ${o.paymentStatus}</small>
                    </td>
                    <td>
                        <span class="order-badge ${badgeClass}">${o.orderStatus}</span>
                    </td>
                    <td style="text-align:center;">
                        <button class="table-action-icon-btn" onclick="RoseOrders.viewDetails('${o.id}')" title="View & Print Invoice">
                            👁️ View
                        </button>
                        ${o.orderStatus !== 'Served' && o.orderStatus !== 'Cancelled' ? `
                            <button class="table-action-icon-btn" onclick="RoseOrders.quickStatusChange('${o.id}')" title="Mark as Completed">
                                ✅ Done
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateKPIs() {
        const orders = RoseStore.getOrders();
        const totalRev = orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.grandTotal, 0);
        const activeCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing' || o.orderStatus === 'Ready').length;
        const dineInCount = orders.filter(o => o.orderType === 'dinein').length;

        if (kpiTotalOrders) kpiTotalOrders.textContent = orders.length;
        if (kpiTotalRevenue) kpiTotalRevenue.textContent = `₹${totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (kpiActiveOrders) kpiActiveOrders.textContent = activeCount;
        if (kpiDineInCount) kpiDineInCount.textContent = dineInCount;
    }

    // Exposed Actions
    window.RoseOrders = {
        viewDetails: function(orderId) {
            const orders = RoseStore.getOrders();
            const order = orders.find(o => o.id === orderId || o.orderNumber == orderId);
            if (!order) return;

            currentSelectedOrder = order;
            document.getElementById('modalOrderTitle').textContent = `Order #${order.orderNumber} Details`;

            const content = document.getElementById('orderDetailContent');
            content.innerHTML = `
                <div class="thermal-receipt" style="margin:0 auto 10px;">
                    <div class="receipt-header">
                        <h2>🌹 ROSEVALLY RESTAURANT</h2>
                        <div>Ulhasnagar, Maharashtra</div>
                        <div>Ph: +91 98234 56789</div>
                    </div>
                    <div class="receipt-divider"></div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Order: <strong>#${order.orderNumber}</strong></span>
                        <span>${new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Type: ${order.orderType.toUpperCase()} (${order.tableNumber})</span>
                        <span>Guest: ${order.customerName}</span>
                    </div>
                    <div class="receipt-divider"></div>
                    <table class="receipt-table">
                        <thead>
                            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th></tr>
                        </thead>
                        <tbody>
                            ${order.items.map(i => `
                                <tr>
                                    <td>${i.name} ${i.note ? `<br><small style="color:#666;">*${i.note}</small>` : ''}</td>
                                    <td style="text-align:center;">${i.quantity}</td>
                                    <td style="text-align:right;">₹${(i.price * i.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="receipt-divider"></div>
                    <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><strong>₹${order.subtotal.toFixed(2)}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span>Discount:</span><strong>- ₹${order.discount.toFixed(2)}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span>GST (5%):</span><strong>₹${order.gst.toFixed(2)}</strong></div>
                    <div class="receipt-divider"></div>
                    <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold;">
                        <span>TOTAL:</span><span>₹${order.grandTotal.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span>Payment:</span><strong>${order.paymentMethod} (${order.paymentStatus})</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:2px;">
                        <span>Kitchen Status:</span><strong style="color:var(--primary);">${order.orderStatus}</strong>
                    </div>
                </div>
            `;

            document.getElementById('orderDetailModal').classList.add('active');
        },

        quickStatusChange: function(orderId) {
            RoseStore.updateOrderStatus(orderId, 'Served');
            RoseStore.showToast("Order marked as completed / served!", "success");
            renderOrdersTable();
            updateKPIs();
        }
    };

    window.closeOrderModal = function() {
        document.getElementById('orderDetailModal').classList.remove('active');
        currentSelectedOrder = null;
    };

    window.printOrderInvoice = function() {
        window.print();
    };

    // Export to CSV
    window.exportOrdersToCSV = function() {
        const orders = RoseStore.getOrders();
        if (orders.length === 0) {
            RoseStore.showToast("No orders available to export.", "warning");
            return;
        }

        let csv = "Order ID,Date Time,Order Type,Table,Customer Name,Phone,Grand Total,Payment Method,Payment Status,Order Status\n";
        orders.forEach(o => {
            csv += `"${o.orderNumber}","${o.createdAt}","${o.orderType}","${o.tableNumber}","${o.customerName}","${o.customerPhone || ''}","${o.grandTotal}","${o.paymentMethod}","${o.paymentStatus}","${o.orderStatus}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `RoseVally_Orders_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        RoseStore.showToast("Orders CSV exported successfully!", "success");
    };

})();