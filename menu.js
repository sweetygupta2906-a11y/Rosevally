/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Menu Management Controller (menu.js)
   ========================================================================== */

(function() {
    'use strict';

    let activeCategory = 'all';
    let searchQuery = '';

    let catalogGrid;
    let metricTotal, metricInStock, metricOutOfStock, metricCategories;

    document.addEventListener('DOMContentLoaded', function() {
        cacheDOMElements();
        setupFilterListeners();
        renderMenuCatalog();
        updateMenuKPIs();

        window.addEventListener('rosevally_update', function() {
            renderMenuCatalog();
            updateMenuKPIs();
        });
    });

    function cacheDOMElements() {
        catalogGrid = document.getElementById('menuCatalogGrid');
        metricTotal = document.getElementById('metricTotalDishes');
        metricInStock = document.getElementById('metricInStockDishes');
        metricOutOfStock = document.getElementById('metricOutOfStockDishes');
        metricCategories = document.getElementById('metricCategoriesCount');
    }

    function setupFilterListeners() {
        // Search Input
        const searchInput = document.getElementById('menuSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.toLowerCase().trim();
                renderMenuCatalog();
            });
        }

        // Category Buttons
        document.querySelectorAll('#menuCategoryFilters .menu-cat-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#menuCategoryFilters .menu-cat-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                activeCategory = this.getAttribute('data-cat');
                renderMenuCatalog();
            });
        });
    }

    function renderMenuCatalog() {
        if (!catalogGrid) return;
        const menu = RoseStore.getMenu();

        const filtered = menu.filter(item => {
            const catMatch = (activeCategory === 'all') || (item.category.toLowerCase() === activeCategory.toLowerCase());
            const searchMatch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery) || 
                (item.description && item.description.toLowerCase().includes(searchQuery));
            return catMatch && searchMatch;
        });

        if (filtered.length === 0) {
            catalogGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#94a3b8;">
                    <div style="font-size:42px; margin-bottom:10px;">🍽️</div>
                    <h3>No menu items found</h3>
                    <p style="font-size:13px;">Try selecting another category or click '+ Add New Dish'.</p>
                </div>
            `;
            return;
        }

        catalogGrid.innerHTML = filtered.map(item => `
            <div class="menu-item-card ${!item.available ? 'out-of-stock' : ''}">
                <div>
                    <div class="menu-card-top">
                        <div class="menu-emoji-box">${item.emoji || '🍽️'}</div>
                        <div class="menu-details">
                            <h3>${item.name}</h3>
                            <div class="menu-tags-row">
                                <span class="${item.type === 'veg' ? 'veg-badge' : 'nonveg-badge'}"></span>
                                <span>${item.category}</span>
                            </div>
                        </div>
                    </div>

                    <p class="menu-desc">${item.description || 'Delicious freshly prepared dish'}</p>
                </div>

                <div class="menu-card-actions">
                    <span class="menu-price-tag">₹${Number(item.price).toFixed(2)}</span>

                    <div class="action-buttons-group">
                        <button class="btn-icon-action" onclick="RoseMenu.toggleAvailability(${item.id})" title="Toggle Stock">
                            ${item.available ? '🟢 In-Stock' : '🔴 Out'}
                        </button>
                        <button class="btn-icon-action" onclick="RoseMenu.editDish(${item.id})" title="Edit Dish">
                            ✏️ Edit
                        </button>
                        <button class="btn-icon-action" onclick="RoseMenu.deleteDish(${item.id})" title="Delete Dish" style="color:#ef4444;">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function updateMenuKPIs() {
        const menu = RoseStore.getMenu();
        const inStock = menu.filter(m => m.available).length;
        const outStock = menu.filter(m => !m.available).length;
        const uniqueCats = new Set(menu.map(m => m.category)).size;

        if (metricTotal) metricTotal.textContent = menu.length;
        if (metricInStock) metricInStock.textContent = inStock;
        if (metricOutOfStock) metricOutOfStock.textContent = outStock;
        if (metricCategories) metricCategories.textContent = uniqueCats;
    }

    // Exposed Actions
    window.RoseMenu = {
        toggleAvailability: function(itemId) {
            const menu = RoseStore.getMenu();
            const item = menu.find(m => m.id === itemId);
            if (item) {
                item.available = !item.available;
                RoseStore.setMenu(menu);
                RoseStore.showToast(`${item.name} marked as ${item.available ? 'In-Stock' : 'Out of Stock'}`, 'info');
                renderMenuCatalog();
                updateMenuKPIs();
            }
        },

        editDish: function(itemId) {
            const menu = RoseStore.getMenu();
            const item = menu.find(m => m.id === itemId);
            if (!item) return;

            document.getElementById('dishModalTitle').textContent = `✏️ Edit ${item.name}`;
            document.getElementById('dishEditId').value = item.id;
            document.getElementById('dishNameInput').value = item.name;
            document.getElementById('dishEmojiInput').value = item.emoji || '🍽️';
            document.getElementById('dishCategoryInput').value = item.category;
            document.getElementById('dishDietInput').value = item.type;
            document.getElementById('dishPriceInput').value = item.price;
            document.getElementById('dishDescInput').value = item.description || '';
            document.getElementById('dishAvailableInput').checked = item.available;

            document.getElementById('dishModal').classList.add('active');
        },

        deleteDish: function(itemId) {
            const menu = RoseStore.getMenu();
            const item = menu.find(m => m.id === itemId);
            if (!item) return;

            if (confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
                const updated = menu.filter(m => m.id !== itemId);
                RoseStore.setMenu(updated);
                RoseStore.showToast(`Deleted "${item.name}" from menu`, 'error');
                renderMenuCatalog();
                updateMenuKPIs();
            }
        }
    };

    // Modal Handling
    window.openDishModal = function() {
        document.getElementById('dishModalTitle').textContent = `✨ Add New Dish`;
        document.getElementById('dishEditId').value = '';
        document.getElementById('dishNameInput').value = '';
        document.getElementById('dishEmojiInput').value = '🍕';
        document.getElementById('dishCategoryInput').value = 'pizza';
        document.getElementById('dishDietInput').value = 'veg';
        document.getElementById('dishPriceInput').value = '';
        document.getElementById('dishDescInput').value = '';
        document.getElementById('dishAvailableInput').checked = true;

        document.getElementById('dishModal').classList.add('active');
    };

    window.closeDishModal = function() {
        document.getElementById('dishModal').classList.remove('active');
    };

    window.handleDishFormSubmit = function(e) {
        e.preventDefault();
        const editId = document.getElementById('dishEditId').value;
        const name = document.getElementById('dishNameInput').value.trim();
        const emoji = document.getElementById('dishEmojiInput').value.trim() || '🍽️';
        const category = document.getElementById('dishCategoryInput').value;
        const type = document.getElementById('dishDietInput').value;
        const price = parseFloat(document.getElementById('dishPriceInput').value) || 0;
        const description = document.getElementById('dishDescInput').value.trim();
        const available = document.getElementById('dishAvailableInput').checked;

        const menu = RoseStore.getMenu();

        if (editId) {
            // Update
            const item = menu.find(m => m.id == editId);
            if (item) {
                item.name = name;
                item.emoji = emoji;
                item.category = category;
                item.type = type;
                item.price = price;
                item.description = description;
                item.available = available;
                RoseStore.showToast(`Updated dish "${name}"`, 'success');
            }
        } else {
            // Add New
            const nextId = menu.length > 0 ? Math.max(...menu.map(m => m.id)) + 1 : 101;
            menu.push({
                id: nextId,
                name,
                emoji,
                category,
                type,
                price,
                description,
                available
            });
            RoseStore.showToast(`Added new dish "${name}" to menu!`, 'success');
        }

        RoseStore.setMenu(menu);
        closeDishModal();
        renderMenuCatalog();
        updateMenuKPIs();
    };

})();