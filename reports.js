/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Business Intelligence & Reports Controller (reports.js)
   ========================================================================== */

(function() {
    'use strict';

    let selectedPeriod = 'all';

    let repGrossSales, repTotalOrders, repAOV, repDineInOccupancy;
    let paymentBreakdownChart, diningChannelChart, topDishesList, categoryRevenueBody;
    let reportDateRangeDisplay;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupPeriodListeners();
        renderReports();

        window.addEventListener('rosevally_update', function() {
            renderReports();
        });
    });

    function cacheDOMElements() {
        repGrossSales = document.getElementById('repGrossSales');
        repTotalOrders = document.getElementById('repTotalOrders');
        repAOV = document.getElementById('repAOV');
        repDineInOccupancy = document.getElementById('repDineInOccupancy');
        paymentBreakdownChart = document.getElementById('paymentBreakdownChart');
        diningChannelChart = document.getElementById('diningChannelChart');
        topDishesList = document.getElementById('topDishesList');
        categoryRevenueBody = document.getElementById('categoryRevenueBody');
        reportDateRangeDisplay = document.getElementById('reportDateRangeDisplay');
    }

    function setupPeriodListeners() {
        document.querySelectorAll('#periodTabs .period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#periodTabs .period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedPeriod = this.getAttribute('data-period');
                renderReports();
            });
        });
    }

    function filterOrdersByPeriod(orders, period) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return orders.filter(o => {
            if (!o.createdAt) return true;
            const orderDate = new Date(o.createdAt);

            if (period === 'today') {
                return orderDate >= startOfToday;
            } else if (period === 'yesterday') {
                return orderDate >= startOfYesterday && orderDate < startOfToday;
            } else if (period === 'week') {
                return orderDate >= sevenDaysAgo;
            }
            return true; // 'all'
        });
    }

    function renderReports() {
        const allOrders = RoseStore.getOrders();
        const orders = filterOrdersByPeriod(allOrders, selectedPeriod);
        const paidOrders = orders.filter(o => o.paymentStatus === 'Paid' || o.orderStatus === 'Served');

        // Period Text
        if (reportDateRangeDisplay) {
            reportDateRangeDisplay.textContent = selectedPeriod === 'today' ? "Period: Today's Live Sales" :
                                                selectedPeriod === 'yesterday' ? "Period: Yesterday's Audited Sales" :
                                                selectedPeriod === 'week' ? "Period: Past 7 Rolling Days" : "Period: All Recorded Sales";
        }

        // Summary Calculations
        const totalGross = paidOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const totalCount = paidOrders.length;
        const aov = totalCount > 0 ? totalGross / totalCount : 0;

        const tables = RoseStore.getTables();
        const occupiedTables = tables.filter(t => t.status === 'occupied').length;
        const occupancyRate = Math.round((occupiedTables / tables.length) * 100);

        if (repGrossSales) repGrossSales.textContent = `₹${totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (repTotalOrders) repTotalOrders.textContent = totalCount;
        if (repAOV) repAOV.textContent = `₹${aov.toFixed(2)}`;
        if (repDineInOccupancy) repDineInOccupancy.textContent = `${occupancyRate}% (${occupiedTables}/25)`;

        renderPaymentChart(paidOrders, totalGross);
        renderDiningChannelChart(paidOrders, totalCount);
        renderTopDishes(paidOrders);
        renderCategoryBreakdown(paidOrders, totalGross);
    }

    function renderPaymentChart(orders, totalRevenue) {
        if (!paymentBreakdownChart) return;

        const modes = { Cash: 0, UPI: 0, Card: 0 };
        orders.forEach(o => {
            const m = o.paymentMethod || 'Cash';
            if (modes[m] !== undefined) modes[m] += o.grandTotal;
            else modes.Cash += o.grandTotal;
        });

        const colors = { Cash: '#10b981', UPI: '#6366f1', Card: '#f59e0b' };

        paymentBreakdownChart.innerHTML = Object.keys(modes).map(mode => {
            const val = modes[mode];
            const pct = totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0;
            return `
                <div class="stat-progress-item">
                    <div class="stat-progress-head">
                        <span>${mode === 'Cash' ? '💵 Cash' : mode === 'UPI' ? '📱 UPI / QR' : '💳 Card'} (${pct}%)</span>
                        <strong style="color:${colors[mode]};">₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill" style="width:${pct}%; background:${colors[mode]};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderDiningChannelChart(orders, totalCount) {
        if (!diningChannelChart) return;

        const channels = { dinein: 0, takeaway: 0, delivery: 0 };
        orders.forEach(o => {
            const ch = o.orderType || 'dinein';
            if (channels[ch] !== undefined) channels[ch] += 1;
            else channels.dinein += 1;
        });

        const labels = { dinein: '🍽️ Dine-In Seated', takeaway: '🛍️ Takeaway Parcel', delivery: '🛵 Home Delivery' };
        const colors = { dinein: '#e11d48', takeaway: '#3b82f6', delivery: '#8b5cf6' };

        diningChannelChart.innerHTML = Object.keys(channels).map(ch => {
            const count = channels[ch];
            const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return `
                <div class="stat-progress-item">
                    <div class="stat-progress-head">
                        <span>${labels[ch]} (${pct}%)</span>
                        <strong style="color:${colors[ch]};">${count} Orders</strong>
                    </div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill" style="width:${pct}%; background:${colors[ch]};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTopDishes(orders) {
        if (!topDishesList) return;

        const dishSales = {};
        orders.forEach(o => {
            o.items.forEach(item => {
                if (!dishSales[item.name]) {
                    dishSales[item.name] = { name: item.name, qty: 0, revenue: 0, emoji: item.emoji || '🍽️' };
                }
                dishSales[item.name].qty += item.quantity;
                dishSales[item.name].revenue += (item.price * item.quantity);
            });
        });

        const sorted = Object.values(dishSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

        if (sorted.length === 0) {
            topDishesList.innerHTML = `<p style="color:#94a3b8; font-size:13px; text-align:center; padding:20px;">No sales data recorded yet.</p>`;
            return;
        }

        topDishesList.innerHTML = sorted.map((dish, idx) => `
            <div class="top-dish-rank-row">
                <div style="display:flex; align-items:center;">
                    <span class="rank-badge">#${idx + 1}</span>
                    <div>
                        <strong style="font-size:13px;">${dish.emoji} ${dish.name}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${dish.qty} portions sold</div>
                    </div>
                </div>
                <strong style="color:var(--primary); font-size:14px;">₹${dish.revenue.toFixed(2)}</strong>
            </div>
        `).join('');
    }

    function renderCategoryBreakdown(orders, totalRevenue) {
        if (!categoryRevenueBody) return;

        const menu = RoseStore.getMenu();
        const catMap = {};
        menu.forEach(m => { catMap[m.name.toLowerCase()] = m.category; });

        const catStats = {
            pizza: { name: '🍕 Pizzas', qty: 0, rev: 0 },
            burger: { name: '🍔 Burgers', qty: 0, rev: 0 },
            sandwich: { name: '🥪 Sandwiches', qty: 0, rev: 0 },
            main: { name: '🍗 Main Course', qty: 0, rev: 0 },
            beverage: { name: '🥤 Beverages', qty: 0, rev: 0 },
            dessert: { name: '🍰 Desserts', qty: 0, rev: 0 }
        };

        orders.forEach(o => {
            o.items.forEach(item => {
                const c = catMap[item.name.toLowerCase()] || 'main';
                if (catStats[c]) {
                    catStats[c].qty += item.quantity;
                    catStats[c].rev += (item.price * item.quantity);
                }
            });
        });

        categoryRevenueBody.innerHTML = Object.keys(catStats).map(key => {
            const cat = catStats[key];
            const sharePct = totalRevenue > 0 ? Math.round((cat.rev / totalRevenue) * 100) : 0;
            return `
                <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td>${cat.qty} items</td>
                    <td><strong style="color:var(--primary);">₹${cat.rev.toFixed(2)}</strong></td>
                    <td>
                        <span style="font-weight:700; color:var(--text-secondary);">${sharePct}%</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

})();