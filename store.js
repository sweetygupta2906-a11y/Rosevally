/* ==========================================================================
   ROSEVALLY RESTAURANT & CAFE MANAGEMENT SYSTEM
   Centralized Store & Real-time State Synchronization Layer (store.js)
   ========================================================================== */

(function(window) {
    'use strict';

    const STORAGE_KEYS = {
        MENU: 'rosevally_menu_items_v2',
        TABLES: 'rosevally_tables_v2',
        ORDERS: 'rosevally_orders_v2',
        INVENTORY: 'rosevally_inventory_v2',
        SETTINGS: 'rosevally_settings_v2',
        ACTIVE_TABLE: 'rosevally_pos_active_table'
    };

    // Default Initial Menu
    const DEFAULT_MENU = [
        { id: 101, name: "Paneer Butter Masala Pizza", category: "pizza", price: 299, type: "veg", emoji: "🍕", description: "Rich makhani sauce, cottage cheese, bell peppers & mozzarella", available: true },
        { id: 102, name: "Spicy Peri Peri Chicken Pizza", category: "pizza", price: 349, type: "nonveg", emoji: "🍕", description: "Grilled peri peri chicken, red paprika & cheddar blend", available: true },
        { id: 103, name: "Classic Margherita Pizza", category: "pizza", price: 239, type: "veg", emoji: "🍕", description: "San Marzano tomatoes, fresh basil & creamy buffalo mozzarella", available: true },
        { id: 104, name: "Crispy Paneer Burger", category: "burger", price: 169, type: "veg", emoji: "🍔", description: "Golden fried paneer patty, lettuce, chipotle mayo & brioche bun", available: true },
        { id: 105, name: "Smoky BBQ Chicken Burger", category: "burger", price: 199, type: "nonveg", emoji: "🍔", description: "Juicy chicken patty, caramelized onions, smoked BBQ glaze", available: true },
        { id: 106, name: "Mumbai Grilled Sandwich", category: "sandwich", price: 139, type: "veg", emoji: "🥪", description: "Spiced potato beetroot filling with house green chutney & cheese", available: true },
        { id: 107, name: "Chicken Tikka Club Sandwich", category: "sandwich", price: 189, type: "nonveg", emoji: "🥪", description: "Triple-layer toasted sandwich with tandoori chicken & fried egg", available: true },
        { id: 108, name: "RoseVally Special Hyderabadi Dum Biryani", category: "main", price: 289, type: "nonveg", emoji: "🍗", description: "Slow-cooked aromatic basmati rice with tender spiced chicken & raita", available: true },
        { id: 109, name: "Paneer Tikka Biryani", category: "main", price: 259, type: "veg", emoji: "🥘", description: "Charcoal smoked paneer cubes layered in saffron spiced basmati", available: true },
        { id: 110, name: "Butter Naan & Dal Makhani Combo", category: "main", price: 219, type: "veg", emoji: "🍛", description: "Creamy slow-cooked black lentils served with 2 hot butter naans", available: true },
        { id: 111, name: "Signature Cafe Mocha", category: "beverage", price: 149, type: "veg", emoji: "☕", description: "Espresso, steamed milk and rich Belgian dark chocolate ganache", available: true },
        { id: 112, name: "Iced Caramel Frappuccino", category: "beverage", price: 179, type: "veg", emoji: "🥤", description: "Blended espresso, salted caramel drizzle, whipped cream", available: true },
        { id: 113, name: "Fresh Mango Mint Mojito", category: "beverage", price: 139, type: "veg", emoji: "🍹", description: "Alphonso mango pulp, crushed fresh mint, lime and fizzy soda", available: true },
        { id: 114, name: "Rose Royal Milkshake", category: "beverage", price: 159, type: "veg", emoji: "🧋", description: "RoseVally signature rose petal syrup, chia seeds, vanilla ice cream", available: true },
        { id: 115, name: "Sizzling Chocolate Brownie", category: "dessert", price: 169, type: "veg", emoji: "🍰", description: "Warm fudge walnut brownie, vanilla gelato & melted chocolate shot", available: true },
        { id: 116, name: "Red Velvet Lava Pastry", category: "dessert", price: 149, type: "veg", emoji: "🧁", description: "Velvety crimson sponge with molten cream cheese filling", available: true }
    ];

    // Default 25 Tables distributed in 4 Zones
    const DEFAULT_TABLES = Array.from({ length: 25 }, (_, i) => {
        const num = i + 1;
        let section = "Indoor Main Hall";
        let capacity = 4;

        if (num <= 8) {
            section = "Indoor Main Hall";
            capacity = (num % 2 === 0) ? 4 : 2;
        } else if (num <= 14) {
            section = "AC Family Lounge";
            capacity = (num % 3 === 0) ? 6 : 4;
        } else if (num <= 20) {
            section = "Open Garden Terrace";
            capacity = (num % 2 === 0) ? 4 : 2;
        } else {
            section = "VIP Executive Booth";
            capacity = 8;
        }

        return {
            id: `T-${num}`,
            number: num,
            name: `Table ${num}`,
            section: section,
            capacity: capacity,
            status: "available", // available, occupied, reserved, cleaning
            currentOrderId: null,
            guestName: "",
            guestPhone: "",
            guestCount: 0,
            occupiedSince: null
        };
    });

    // Default Inventory items
    const DEFAULT_INVENTORY = [
        { id: "INV-101", name: "Arabica Coffee Beans (kg)", category: "Beverages", stock: 18.5, minStock: 5, unit: "kg", costPerUnit: 850 },
        { id: "INV-102", name: "Fresh Milk (Litres)", category: "Dairy", stock: 42, minStock: 15, unit: "L", costPerUnit: 64 },
        { id: "INV-103", name: "Mozzarella Cheese (kg)", category: "Dairy", stock: 12.0, minStock: 4, unit: "kg", costPerUnit: 480 },
        { id: "INV-104", name: "Fresh Paneer (kg)", category: "Dairy", stock: 8.5, minStock: 3, unit: "kg", costPerUnit: 340 },
        { id: "INV-105", name: "Fresh Chicken Breast (kg)", category: "Meat", stock: 16.0, minStock: 6, unit: "kg", costPerUnit: 260 },
        { id: "INV-106", name: "Basmati Rice 1121 (kg)", category: "Grains", stock: 55.0, minStock: 20, unit: "kg", costPerUnit: 110 },
        { id: "INV-107", name: "Burger Buns (Pack of 6)", category: "Bakery", stock: 24, minStock: 8, unit: "packs", costPerUnit: 50 },
        { id: "INV-108", name: "Rose Blossom Syrup (Litres)", category: "Syrups", stock: 6.5, minStock: 2, unit: "L", costPerUnit: 220 },
        { id: "INV-109", name: "Dark Chocolate Chips (kg)", category: "Bakery", stock: 4.0, minStock: 2, unit: "kg", costPerUnit: 380 },
        { id: "INV-110", name: "Takeaway Kraft Boxes (Pcs)", category: "Packaging", stock: 180, minStock: 50, unit: "pcs", costPerUnit: 12 }
    ];

    // Seed Demo Orders for realistic reporting immediately
    function generateInitialOrders() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        return [
            {
                id: "ORD-901",
                orderNumber: 901,
                orderType: "dinein",
                tableNumber: "Table 3",
                tableId: "T-3",
                customerName: "Rahul Sharma",
                customerPhone: "9820112345",
                items: [
                    { id: 101, name: "Paneer Butter Masala Pizza", price: 299, quantity: 1, type: "veg", note: "Extra crispy base" },
                    { id: 111, name: "Signature Cafe Mocha", price: 149, quantity: 2, type: "veg", note: "" }
                ],
                subtotal: 597,
                discount: 50,
                gst: 27.35,
                grandTotal: 574.35,
                paymentMethod: "UPI",
                paymentStatus: "Paid",
                orderStatus: "Served",
                createdAt: new Date(today.getTime() - 45 * 60000).toISOString(),
                completedAt: new Date(today.getTime() - 15 * 60000).toISOString()
            },
            {
                id: "ORD-902",
                orderNumber: 902,
                orderType: "dinein",
                tableNumber: "Table 7",
                tableId: "T-7",
                customerName: "Priya Deshmukh",
                customerPhone: "9876543210",
                items: [
                    { id: 108, name: "RoseVally Special Hyderabadi Dum Biryani", price: 289, quantity: 2, type: "nonveg", note: "Spicy" },
                    { id: 114, name: "Rose Royal Milkshake", price: 159, quantity: 2, type: "veg", note: "" }
                ],
                subtotal: 896,
                discount: 0,
                gst: 44.8,
                grandTotal: 940.8,
                paymentMethod: "Card",
                paymentStatus: "Paid",
                orderStatus: "Served",
                createdAt: new Date(today.getTime() - 90 * 60000).toISOString(),
                completedAt: new Date(today.getTime() - 40 * 60000).toISOString()
            },
            {
                id: "ORD-903",
                orderNumber: 903,
                orderType: "takeaway",
                tableNumber: "Takeaway",
                tableId: null,
                customerName: "Amit Verma",
                customerPhone: "9123456789",
                items: [
                    { id: 104, name: "Crispy Paneer Burger", price: 169, quantity: 2, type: "veg", note: "No onions" },
                    { id: 112, name: "Iced Caramel Frappuccino", price: 179, quantity: 1, type: "veg", note: "" },
                    { id: 115, name: "Sizzling Chocolate Brownie", price: 169, quantity: 1, type: "veg", note: "Pack separately" }
                ],
                subtotal: 686,
                discount: 40,
                gst: 32.3,
                grandTotal: 678.3,
                paymentMethod: "Cash",
                paymentStatus: "Paid",
                orderStatus: "Served",
                createdAt: new Date(yesterday.getTime() + 180 * 60000).toISOString(),
                completedAt: new Date(yesterday.getTime() + 210 * 60000).toISOString()
            }
        ];
    }

    const RoseStore = {
        // --- Getters & Setters ---
        getMenu: function() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.MENU);
                if (data) return JSON.parse(data);
            } catch(e) { console.error(e); }
            this.setMenu(DEFAULT_MENU);
            return DEFAULT_MENU;
        },

        setMenu: function(menu) {
            localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menu));
            this.notifyChange('menu');
        },

        getTables: function() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.TABLES);
                if (data) return JSON.parse(data);
            } catch(e) { console.error(e); }
            this.setTables(DEFAULT_TABLES);
            return DEFAULT_TABLES;
        },

        setTables: function(tables) {
            localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
            this.notifyChange('tables');
        },

        getOrders: function() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
                if (data) return JSON.parse(data);
            } catch(e) { console.error(e); }
            const initial = generateInitialOrders();
            this.setOrders(initial);
            return initial;
        },

        setOrders: function(orders) {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
            this.notifyChange('orders');
        },

        getInventory: function() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
                if (data) return JSON.parse(data);
            } catch(e) { console.error(e); }
            this.setInventory(DEFAULT_INVENTORY);
            return DEFAULT_INVENTORY;
        },

        setInventory: function(inventory) {
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
            this.notifyChange('inventory');
        },

        // --- Active Table for POS selection ---
        setActivePosTable: function(tableNumber) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_TABLE, tableNumber);
        },

        getActivePosTable: function() {
            return localStorage.getItem(STORAGE_KEYS.ACTIVE_TABLE) || "";
        },

        clearActivePosTable: function() {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_TABLE);
        },

        // --- Core Order Creation & Sync ---
        createOrder: function(orderData) {
            const orders = this.getOrders();
            const nextNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 900)) + 1 : 901;
            
            const newOrder = {
                id: `ORD-${nextNum}`,
                orderNumber: nextNum,
                orderType: orderData.orderType || 'dinein',
                tableNumber: orderData.tableNumber || 'Takeaway',
                tableId: orderData.tableId || null,
                customerName: orderData.customerName || 'Walk-in Guest',
                customerPhone: orderData.customerPhone || '',
                items: orderData.items || [],
                subtotal: Number(orderData.subtotal || 0),
                discount: Number(orderData.discount || 0),
                gst: Number(orderData.gst || 0),
                grandTotal: Number(orderData.grandTotal || 0),
                paymentMethod: orderData.paymentMethod || 'Cash',
                paymentStatus: orderData.paymentStatus || 'Paid',
                orderStatus: orderData.orderStatus || 'Pending', // Pending, Preparing, Ready, Served, Cancelled
                createdAt: new Date().toISOString(),
                completedAt: null
            };

            orders.unshift(newOrder);
            this.setOrders(orders);

            // If dine-in, update Table state
            if (newOrder.orderType === 'dinein' && newOrder.tableNumber && newOrder.tableNumber !== 'Takeaway') {
                this.updateTableOccupancy(newOrder.tableNumber, newOrder.id, newOrder.customerName, newOrder.customerPhone, newOrder.items.length);
            }

            // Play notification sound
            this.playSound('order');
            return newOrder;
        },

        updateOrderStatus: function(orderId, newStatus) {
            const orders = this.getOrders();
            const order = orders.find(o => o.id === orderId || o.orderNumber == orderId);
            if (order) {
                order.orderStatus = newStatus;
                if (newStatus === 'Served' || newStatus === 'Paid') {
                    order.completedAt = new Date().toISOString();
                }
                this.setOrders(orders);
                this.playSound('bell');
                return true;
            }
            return false;
        },

        updateTableOccupancy: function(tableNumber, orderId, guestName, guestPhone, guestCount) {
            const tables = this.getTables();
            const target = tables.find(t => t.name.toLowerCase() === String(tableNumber).toLowerCase() || t.number == tableNumber);
            if (target) {
                target.status = "occupied";
                target.currentOrderId = orderId;
                target.guestName = guestName || "Guest";
                target.guestPhone = guestPhone || "";
                target.guestCount = guestCount || 2;
                target.occupiedSince = new Date().toISOString();
                this.setTables(tables);
            }
        },

        releaseTable: function(tableNumber) {
            const tables = this.getTables();
            const target = tables.find(t => t.name.toLowerCase() === String(tableNumber).toLowerCase() || t.number == tableNumber);
            if (target) {
                target.status = "cleaning";
                target.currentOrderId = null;
                target.guestName = "";
                target.guestPhone = "";
                target.guestCount = 0;
                target.occupiedSince = null;
                this.setTables(tables);
                
                // After 10 seconds auto turn to available or user can click
                setTimeout(() => {
                    const currentTables = RoseStore.getTables();
                    const t = currentTables.find(item => item.id === target.id);
                    if (t && t.status === "cleaning") {
                        t.status = "available";
                        RoseStore.setTables(currentTables);
                    }
                }, 15000);
            }
        },

        // --- Cross Tab Notification ---
        notifyChange: function(channel) {
            try {
                window.dispatchEvent(new CustomEvent('rosevally_update', { detail: { channel } }));
            } catch(e) {}
        },

        // --- Web Audio API Chime & Sound Generator ---
        playSound: function(type = 'chime') {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();

                if (type === 'order') {
                    // Two-tone cheerful doorbell chime
                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

                    osc1.connect(gain);
                    gain.connect(ctx.destination);
                    osc1.start();
                    osc1.stop(ctx.currentTime + 0.6);
                } else if (type === 'bell') {
                    // Kitchen bell ring
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
                    gain.gain.setValueAtTime(0.35, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.8);
                }
            } catch(err) {
                // Audio context not allowed until user interaction - silent fallback
            }
        },

        // --- Quick Toast Notification ---
        showToast: function(message, type = 'success') {
            let container = document.getElementById('roseToastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'roseToastContainer';
                container.style.cssText = `
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                `;
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            const bg = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#6366f1';
            const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';

            toast.style.cssText = `
                background: ${bg};
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 10px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 10px 25px rgba(0,0,0,0.25);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: roseSlideIn 0.3s ease forwards;
                pointer-events: auto;
                max-width: 360px;
            `;
            toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }
    };

    // Auto-listen to cross-tab storage changes
    window.addEventListener('storage', function(e) {
        if (Object.values(STORAGE_KEYS).includes(e.key)) {
            RoseStore.notifyChange('storage');
        }
    });

    // Expose globally
    window.RoseStore = RoseStore;

})(window);
