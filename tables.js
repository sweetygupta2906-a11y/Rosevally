/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Floor Plan & Table Management Controller (tables.js)
   ========================================================================== */

(function() {
    'use strict';

    let activeZoneFilter = 'all';
    let activeStatusFilter = 'all';

    let tablesContainer;
    let metricTotal, metricAvailable, metricOccupied, metricReserved;
    let sidebarOccupiedBadge;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupFilterListeners();
        renderTables();
        updateTableMetrics();

        window.addEventListener('rosevally_update', function() {
            renderTables();
            updateTableMetrics();
        });
    });

    function cacheDOMElements() {
        tablesContainer = document.getElementById('tablesContainer');
        metricTotal = document.getElementById('metricTotalTables');
        metricAvailable = document.getElementById('metricAvailableTables');
        metricOccupied = document.getElementById('metricOccupiedTables');
        metricReserved = document.getElementById('metricReservedTables');
        sidebarOccupiedBadge = document.getElementById('sidebarOccupiedBadge');
    }

    function setupFilterListeners() {
        // Zone Filter
        document.querySelectorAll('#zoneFilterTabs .filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#zoneFilterTabs .filter-tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeZoneFilter = this.getAttribute('data-zone');
                renderTables();
            });
        });

        // Status Filter
        document.querySelectorAll('#statusFilterTabs .filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#statusFilterTabs .filter-tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeStatusFilter = this.getAttribute('data-status');
                renderTables();
            });
        });
    }

    function renderTables() {
        if (!tablesContainer) return;
        const tables = RoseStore.getTables();
        const orders = RoseStore.getOrders();

        const filtered = tables.filter(t => {
            const zoneMatch = (activeZoneFilter === 'all') || (t.section === activeZoneFilter);
            const statusMatch = (activeStatusFilter === 'all') || (t.status === activeStatusFilter);
            return zoneMatch && statusMatch;
        });

        if (filtered.length === 0) {
            tablesContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#94a3b8;">
                    <div style="font-size:42px; margin-bottom:10px;">🍽️</div>
                    <h3>No tables match the selected filter</h3>
                    <p style="font-size:13px;">Choose a different zone or status.</p>
                </div>
            `;
            return;
        }

        tablesContainer.innerHTML = filtered.map(t => {
            let activeOrder = null;
            if (t.currentOrderId) {
                activeOrder = orders.find(o => o.id === t.currentOrderId || o.orderNumber == t.currentOrderId);
            }

            let elapsedMinutes = 0;
            if (t.occupiedSince) {
                elapsedMinutes = Math.floor((new Date() - new Date(t.occupiedSince)) / 60000);
            }

            const pillClass = t.status === 'available' ? 'pill-available' :
                             t.status === 'occupied' ? 'pill-occupied' :
                             t.status === 'reserved' ? 'pill-reserved' : 'pill-cleaning';

            const statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);

            return `
                <div class="table-card ${t.status}">
                    <div>
                        <div class="table-head-row">
                            <div class="table-title-group">
                                <h3>${t.name}</h3>
                                <span class="table-zone-sub">${t.section} • ${t.capacity} Seats</span>
                            </div>
                            <span class="table-status-pill ${pillClass}">
                                ${statusText}
                            </span>
                        </div>

                        <div class="table-center-info">
                            ${t.status === 'occupied' && activeOrder ? `
                                <div class="occupied-details">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span>Order <strong>#${activeOrder.orderNumber}</strong></span>
                                        <span class="occupied-amount">₹${activeOrder.grandTotal.toFixed(2)}</span>
                                    </div>
                                    <div style="color:var(--text-muted); font-size:11px;">
                                        👤 ${t.guestName || 'Guest'} (${t.guestCount || 2}p) • ⏱️ ${elapsedMinutes}m seated
                                    </div>
                                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                                        🛒 ${activeOrder.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ')}${activeOrder.items.length > 2 ? '...' : ''}
                                    </div>
                                </div>
                            ` : t.status === 'reserved' ? `
                                <div style="font-size:13px; color:#b45309;">
                                    <strong>Reserved for:</strong> ${t.guestName || 'Guest'}<br>
                                    <small>📞 ${t.guestPhone || 'N/A'} • ${t.guestCount || 2} Guests</small>
                                </div>
                            ` : t.status === 'cleaning' ? `
                                <div style="font-size:13px; color:#1d4ed8;">
                                    🧹 <strong>Table is being sanitized</strong><br>
                                    <small>Ready for next guests shortly</small>
                                </div>
                            ` : `
                                <div style="font-size:13px; color:#047857;">
                                    ✅ <strong>Ready for Dining</strong><br>
                                    <small>Seats up to ${t.capacity} guests comfortably</small>
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="table-actions-row">
                        ${t.status === 'available' ? `
                            <button class="table-btn table-btn-primary" onclick="RoseTables.openPosForTable('${t.name}')">
                                🛒 Open POS
                            </button>
                            <button class="table-btn table-btn-secondary" onclick="RoseTables.quickReserve('${t.name}')">
                                📅 Reserve
                            </button>
                        ` : t.status === 'occupied' ? `
                            <button class="table-btn table-btn-primary" onclick="RoseTables.openPosForTable('${t.name}')">
                                🧾 View / Settle
                            </button>
                            <button class="table-btn table-btn-secondary" onclick="RoseTables.clearTable('${t.name}')">
                                🚪 Vacate
                            </button>
                        ` : t.status === 'reserved' ? `
                            <button class="table-btn table-btn-primary" onclick="RoseTables.seatReserved('${t.name}')">
                                🍽️ Seat Guests
                            </button>
                            <button class="table-btn table-btn-secondary" onclick="RoseTables.clearTable('${t.name}')">
                                ✕ Cancel
                            </button>
                        ` : `
                            <button class="table-btn table-btn-primary" onclick="RoseTables.makeAvailable('${t.name}')">
                                ✅ Mark Ready
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateTableMetrics() {
        const tables = RoseStore.getTables();
        const available = tables.filter(t => t.status === 'available').length;
        const occupied = tables.filter(t => t.status === 'occupied').length;
        const reserved = tables.filter(t => t.status === 'reserved').length;

        if (metricTotal) metricTotal.textContent = tables.length;
        if (metricAvailable) metricAvailable.textContent = available;
        if (metricOccupied) metricOccupied.textContent = occupied;
        if (metricReserved) metricReserved.textContent = reserved;
        if (sidebarOccupiedBadge) sidebarOccupiedBadge.textContent = `${occupied}/${tables.length}`;
    }

    // Exposed Table Actions
    window.RoseTables = {
        openPosForTable: function(tableName) {
            RoseStore.setActivePosTable(tableName);
            window.location.href = 'index.html';
        },

        clearTable: function(tableName) {
            if (confirm(`Free and clean ${tableName}?`)) {
                RoseStore.releaseTable(tableName);
                RoseStore.showToast(`${tableName} is now marked for cleaning`, 'info');
                renderTables();
                updateTableMetrics();
            }
        },

        makeAvailable: function(tableName) {
            const tables = RoseStore.getTables();
            const target = tables.find(t => t.name === tableName);
            if (target) {
                target.status = 'available';
                RoseStore.setTables(tables);
                RoseStore.showToast(`${tableName} is now available!`, 'success');
                renderTables();
                updateTableMetrics();
            }
        },

        quickReserve: function(tableName) {
            openReservationModal(tableName);
        },

        seatReserved: function(tableName) {
            RoseStore.setActivePosTable(tableName);
            window.location.href = 'index.html';
        }
    };

    // Modal Handling
    window.openReservationModal = function(preselectedTable = '') {
        const tables = RoseStore.getTables().filter(t => t.status === 'available');
        const select = document.getElementById('reserveTableSelect');
        if (!select) return;

        select.innerHTML = tables.map(t => `
            <option value="${t.name}" ${t.name === preselectedTable ? 'selected' : ''}>
                ${t.name} (${t.section} - ${t.capacity}p)
            </option>
        `).join('');

        if (tables.length === 0) {
            RoseStore.showToast("No available tables to reserve right now!", "warning");
            return;
        }

        document.getElementById('reserveModal').classList.add('active');
    };

    window.closeReservationModal = function() {
        document.getElementById('reserveModal').classList.remove('active');
    };

    window.handleTableReservation = function(event) {
        event.preventDefault();
        const tableName = document.getElementById('reserveTableSelect').value;
        const guestName = document.getElementById('reserveGuestName').value.trim();
        const guestPhone = document.getElementById('reserveGuestPhone').value.trim();
        const guestCount = parseInt(document.getElementById('reserveGuestCount').value) || 2;

        const tables = RoseStore.getTables();
        const target = tables.find(t => t.name === tableName);
        if (target) {
            target.status = 'reserved';
            target.guestName = guestName;
            target.guestPhone = guestPhone;
            target.guestCount = guestCount;
            RoseStore.setTables(tables);
            RoseStore.showToast(`Table ${tableName} successfully reserved for ${guestName}!`, 'success');
        }

        closeReservationModal();
        renderTables();
        updateTableMetrics();
    };

})();