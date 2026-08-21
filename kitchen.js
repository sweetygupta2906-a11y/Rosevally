/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Kitchen Display System (KDS) Controller (kitchen.js)
   ========================================================================== */

(function() {
    'use strict';

    let activeFilter = 'active';
    let soundEnabled = true;
    let checkedItemsState = {}; // orderId -> itemIndex -> boolean

    let ticketsGrid;
    let pendingCountEl, prepCountEl, readyCountEl;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupEventListeners();
        renderTickets();
        updateMetrics();
        startKdsClock();
        startTimerInterval();

        window.addEventListener('rosevally_update', function() {
            renderTickets();
            updateMetrics();
        });
    });

    function cacheDOMElements() {
        ticketsGrid = document.getElementById('kdsTicketsGrid');
        pendingCountEl = document.getElementById('kdsPendingCount');
        prepCountEl = document.getElementById('kdsPrepCount');
        readyCountEl = document.getElementById('kdsReadyCount');
    }

    function setupEventListeners() {
        document.querySelectorAll('#kdsFilterTabs .kds-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#kdsFilterTabs .kds-filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeFilter = this.getAttribute('data-status');
                renderTickets();
            });
        });
    }

    function renderTickets() {
        if (!ticketsGrid) return;
        const orders = RoseStore.getOrders();

        const filtered = orders.filter(o => {
            if (activeFilter === 'active') {
                return o.orderStatus === 'Pending' || o.orderStatus === 'Preparing' || o.orderStatus === 'Ready';
            }
            return o.orderStatus === activeFilter;
        });

        if (filtered.length === 0) {
            ticketsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:80px 20px; color:#6b7280;">
                    <div style="font-size:54px; margin-bottom:12px;">👨‍🍳</div>
                    <h2>No Orders in this View</h2>
                    <p style="font-size:14px; margin-top:4px;">New incoming POS orders will instantly appear here with audio alerts.</p>
                </div>
            `;
            return;
        }

        ticketsGrid.innerHTML = filtered.map(order => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const timerClass = elapsed > 20 ? '#ef4444' : elapsed > 10 ? '#f59e0b' : '#10b981';
            
            const headClass = order.orderStatus === 'Pending' ? 'pending-head' :
                             order.orderStatus === 'Preparing' ? 'prep-head' : 'ready-head';
            
            const cardBorder = order.orderStatus === 'Pending' ? 'ticket-pending' :
                              order.orderStatus === 'Preparing' ? 'ticket-preparing' : 'ticket-ready';

            return `
                <div class="kds-ticket-card ${cardBorder}">
                    <div class="ticket-header ${headClass}">
                        <div class="ticket-order-id">#${order.orderNumber} • ${order.orderType.toUpperCase()}</div>
                        <div class="ticket-timer" style="color:${timerClass};">
                            ⏱️ <span>${elapsed}m</span>
                        </div>
                    </div>

                    <div class="ticket-sub-meta">
                        <span>📍 ${order.tableNumber}</span>
                        <span>👤 ${order.customerName}</span>
                    </div>

                    <div class="ticket-items-list">
                        ${order.items.map((item, idx) => {
                            const isDone = checkedItemsState[order.id] && checkedItemsState[order.id][idx];
                            return `
                                <div class="ticket-item-row ${isDone ? 'done' : ''}" onclick="RoseKDS.toggleItemDone('${order.id}', ${idx})">
                                    <div class="ticket-item-check"></div>
                                    <div class="ticket-item-details">
                                        <div class="ticket-item-name">
                                            <span class="ticket-item-qty">${item.quantity}x</span>
                                            ${item.name}
                                        </div>
                                        ${item.note ? `<div class="ticket-note-highlight">⚠️ ${item.note}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="ticket-footer-actions">
                        ${order.orderStatus === 'Pending' ? `
                            <button class="kds-action-btn btn-start-cook" onclick="RoseKDS.advanceStatus('${order.id}', 'Preparing')">
                                🔥 Start Cooking
                            </button>
                        ` : order.orderStatus === 'Preparing' ? `
                            <button class="kds-action-btn btn-mark-ready" onclick="RoseKDS.advanceStatus('${order.id}', 'Ready')">
                                ✅ Mark as Ready
                            </button>
                        ` : order.orderStatus === 'Ready' ? `
                            <button class="kds-action-btn btn-mark-served" onclick="RoseKDS.advanceStatus('${order.id}', 'Served')">
                                🍽️ Complete & Served
                            </button>
                        ` : `
                            <div style="text-align:center; font-size:13px; color:#10b981; font-weight:bold;">
                                ✓ Served to Customer
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateMetrics() {
        const orders = RoseStore.getOrders();
        const pending = orders.filter(o => o.orderStatus === 'Pending').length;
        const prep = orders.filter(o => o.orderStatus === 'Preparing').length;
        const ready = orders.filter(o => o.orderStatus === 'Ready').length;

        if (pendingCountEl) pendingCountEl.textContent = pending;
        if (prepCountEl) prepCountEl.textContent = prep;
        if (readyCountEl) readyCountEl.textContent = ready;
    }

    function getElapsedMinutes(dateString) {
        if (!dateString) return 0;
        return Math.max(0, Math.floor((new Date() - new Date(dateString)) / 60000));
    }

    // Exposed Actions
    window.RoseKDS = {
        advanceStatus: function(orderId, nextStatus) {
            RoseStore.updateOrderStatus(orderId, nextStatus);
            if (soundEnabled) RoseStore.playSound('bell');
            RoseStore.showToast(`Order status updated to ${nextStatus}`, 'success');
            renderTickets();
            updateMetrics();
        },

        toggleItemDone: function(orderId, itemIndex) {
            if (!checkedItemsState[orderId]) checkedItemsState[orderId] = {};
            checkedItemsState[orderId][itemIndex] = !checkedItemsState[orderId][itemIndex];
            renderTickets();
        }
    };

    // Kitchen Sound Toggle
    window.toggleKitchenSound = function() {
        soundEnabled = !soundEnabled;
        const btn = document.getElementById('soundToggleBtn');
        if (btn) {
            btn.textContent = soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
            btn.style.color = soundEnabled ? '#e5e7eb' : '#ef4444';
        }
        RoseStore.showToast(`Kitchen audio alerts ${soundEnabled ? 'Enabled' : 'Muted'}`, 'info');
    };

    // Fullscreen Toggle
    window.toggleFullscreen = function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // Live Clock
    function startKdsClock() {
        const clock = document.getElementById('kdsClock');
        if (!clock) return;
        const update = () => {
            clock.textContent = new Date().toLocaleTimeString();
        };
        update();
        setInterval(update, 1000);
    }

    // Auto Refresh Elapsed Timers every 30s
    function startTimerInterval() {
        setInterval(() => {
            renderTickets();
            updateMetrics();
        }, 30000);
    }

})();