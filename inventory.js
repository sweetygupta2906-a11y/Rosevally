/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Inventory & Stock Controller (inventory.js)
   ========================================================================== */

(function() {
    'use strict';

    let activeCategory = 'all';
    let searchQuery = '';

    let invTableBody;
    let metricTotal, metricAdequate, metricLow, metricValuation;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupFilterListeners();
        renderInventoryTable();
        updateInventoryKPIs();

        window.addEventListener('rosevally_update', function() {
            renderInventoryTable();
            updateInventoryKPIs();
        });
    });

    function cacheDOMElements() {
        invTableBody = document.getElementById('inventoryTableBody');
        metricTotal = document.getElementById('invTotalItems');
        metricAdequate = document.getElementById('invAdequateStock');
        metricLow = document.getElementById('invLowStock');
        metricValuation = document.getElementById('invTotalValuation');
    }

    function setupFilterListeners() {
        // Search Input
        const searchInput = document.getElementById('invSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.toLowerCase().trim();
                renderInventoryTable();
            });
        }

        // Category Filter
        document.querySelectorAll('#invCategoryFilters .inv-cat-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#invCategoryFilters .inv-cat-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeCategory = this.getAttribute('data-cat');
                renderInventoryTable();
            });
        });
    }

    function renderInventoryTable() {
        if (!invTableBody) return;
        const inventory = RoseStore.getInventory();

        const filtered = inventory.filter(item => {
            const catMatch = (activeCategory === 'all') || (item.category === activeCategory);
            const searchMatch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery) || 
                item.category.toLowerCase().includes(searchQuery);
            return catMatch && searchMatch;
        });

        if (filtered.length === 0) {
            invTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:50px 20px; color:#94a3b8;">
                        <div style="font-size:36px; margin-bottom:8px;">📦</div>
                        <strong>No matching stock items found</strong>
                    </td>
                </tr>
            `;
            return;
        }

        invTableBody.innerHTML = filtered.map(item => {
            const totalValue = item.stock * item.costPerUnit;
            const ratio = item.stock / (item.minStock * 2 || 10);
            const pct = Math.min(100, Math.round(ratio * 100));
            const isLow = item.stock <= item.minStock;
            const fillClass = isLow ? 'fill-danger' : pct < 60 ? 'fill-warn' : 'fill-safe';

            return `
                <tr>
                    <td>
                        <strong>${item.name}</strong>
                        ${isLow ? `<br><span class="reorder-badge">⚠️ Low Stock (Reorder)</span>` : ''}
                    </td>
                    <td>
                        <span style="font-weight:600; color:var(--text-secondary);">${item.category}</span>
                    </td>
                    <td>
                        <strong style="font-size:14px;">${item.stock} ${item.unit}</strong>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="stock-meter-wrap">
                                <div class="stock-meter-fill ${fillClass}" style="width: ${pct}%;"></div>
                            </div>
                            <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${pct}%</span>
                        </div>
                    </td>
                    <td>
                        <span style="color:var(--text-muted); font-size:12px;">Min ${item.minStock} ${item.unit}</span>
                    </td>
                    <td>
                        <span>₹${item.costPerUnit.toFixed(2)} / ${item.unit}</span>
                    </td>
                    <td>
                        <strong style="color:var(--primary);">₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </td>
                    <td style="text-align:center;">
                        <button class="table-action-icon-btn" onclick="RoseInventory.openRestock('${item.id}')" title="Add Stock" style="background:var(--success-light); color:#047857;">
                            + Restock
                        </button>
                        <button class="table-action-icon-btn" onclick="RoseInventory.editItem('${item.id}')" title="Edit Item">
                            ✏️
                        </button>
                        <button class="table-action-icon-btn" onclick="RoseInventory.deleteItem('${item.id}')" title="Delete Item" style="color:#ef4444;">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateInventoryKPIs() {
        const inventory = RoseStore.getInventory();
        const totalItems = inventory.length;
        const lowCount = inventory.filter(i => i.stock <= i.minStock).length;
        const adequate = totalItems - lowCount;
        const totalVal = inventory.reduce((sum, i) => sum + (i.stock * i.costPerUnit), 0);

        if (metricTotal) metricTotal.textContent = totalItems;
        if (metricAdequate) metricAdequate.textContent = adequate;
        if (metricLow) metricLow.textContent = lowCount;
        if (metricValuation) metricValuation.textContent = `₹${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    // Exposed Actions
    window.RoseInventory = {
        openRestock: function(itemId) {
            const inventory = RoseStore.getInventory();
            const item = inventory.find(i => i.id === itemId);
            if (!item) return;

            document.getElementById('restockItemId').value = item.id;
            document.getElementById('restockModalTitle').textContent = `+ Restock: ${item.name}`;
            document.getElementById('restockQtyInput').value = '5';
            document.getElementById('restockModal').classList.add('active');
        },

        editItem: function(itemId) {
            const inventory = RoseStore.getInventory();
            const item = inventory.find(i => i.id === itemId);
            if (!item) return;

            document.getElementById('invModalTitle').textContent = `✏️ Edit ${item.name}`;
            document.getElementById('invEditId').value = item.id;
            document.getElementById('invNameInput').value = item.name;
            document.getElementById('invCategoryInput').value = item.category;
            document.getElementById('invUnitInput').value = item.unit;
            document.getElementById('invStockInput').value = item.stock;
            document.getElementById('invMinStockInput').value = item.minStock;
            document.getElementById('invCostInput').value = item.costPerUnit;

            document.getElementById('inventoryModal').classList.add('active');
        },

        deleteItem: function(itemId) {
            const inventory = RoseStore.getInventory();
            const item = inventory.find(i => i.id === itemId);
            if (!item) return;

            if (confirm(`Remove "${item.name}" from inventory tracking?`)) {
                const updated = inventory.filter(i => i.id !== itemId);
                RoseStore.setInventory(updated);
                RoseStore.showToast(`Removed "${item.name}"`, 'error');
                renderInventoryTable();
                updateInventoryKPIs();
            }
        }
    };

    // Restock Modal
    window.closeRestockModal = function() {
        document.getElementById('restockModal').classList.remove('active');
    };

    window.confirmRestock = function() {
        const itemId = document.getElementById('restockItemId').value;
        const addQty = parseFloat(document.getElementById('restockQtyInput').value) || 0;

        if (addQty <= 0) {
            RoseStore.showToast("Please enter a valid quantity to add!", "warning");
            return;
        }

        const inventory = RoseStore.getInventory();
        const item = inventory.find(i => i.id === itemId);
        if (item) {
            item.stock += addQty;
            RoseStore.setInventory(inventory);
            RoseStore.showToast(`Added +${addQty} ${item.unit} to ${item.name}`, 'success');
        }

        closeRestockModal();
        renderInventoryTable();
        updateInventoryKPIs();
    };

    // Add/Edit Item Modal
    window.openInventoryModal = function() {
        document.getElementById('invModalTitle').textContent = `✨ Add Inventory Item`;
        document.getElementById('invEditId').value = '';
        document.getElementById('invNameInput').value = '';
        document.getElementById('invCategoryInput').value = 'Dairy';
        document.getElementById('invUnitInput').value = 'kg';
        document.getElementById('invStockInput').value = '10';
        document.getElementById('invMinStockInput').value = '3';
        document.getElementById('invCostInput').value = '150';

        document.getElementById('inventoryModal').classList.add('active');
    };

    window.closeInventoryModal = function() {
        document.getElementById('inventoryModal').classList.remove('active');
    };

    window.handleInventoryFormSubmit = function(e) {
        e.preventDefault();
        const editId = document.getElementById('invEditId').value;
        const name = document.getElementById('invNameInput').value.trim();
        const category = document.getElementById('invCategoryInput').value;
        const unit = document.getElementById('invUnitInput').value;
        const stock = parseFloat(document.getElementById('invStockInput').value) || 0;
        const minStock = parseFloat(document.getElementById('invMinStockInput').value) || 0;
        const costPerUnit = parseFloat(document.getElementById('invCostInput').value) || 0;

        const inventory = RoseStore.getInventory();

        if (editId) {
            // Update
            const item = inventory.find(i => i.id === editId);
            if (item) {
                item.name = name;
                item.category = category;
                item.unit = unit;
                item.stock = stock;
                item.minStock = minStock;
                item.costPerUnit = costPerUnit;
                RoseStore.showToast(`Updated stock item "${name}"`, 'success');
            }
        } else {
            // Add New
            const nextNum = inventory.length + 101;
            inventory.push({
                id: `INV-${nextNum}`,
                name,
                category,
                unit,
                stock,
                minStock,
                costPerUnit
            });
            RoseStore.showToast(`Added "${name}" to inventory!`, 'success');
        }

        RoseStore.setInventory(inventory);
        closeInventoryModal();
        renderInventoryTable();
        updateInventoryKPIs();
    };

})();
