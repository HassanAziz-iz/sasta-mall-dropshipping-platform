const express = require("express");
const db = require("../database");
const { requireAdmin } = require("../middleware/admin-auth");

const router = express.Router();

// Safe, non-destructive migration: add shipping and rejection fields if missing.
const existingOrderColumns = new Set(
    db.prepare("PRAGMA table_info(orders)").all().map(column => column.name)
);
const addedShippedAtColumn = !existingOrderColumns.has("shipped_at");
for (const [column, definition] of [
    ["courier_name", "TEXT"],
    ["tracking_number", "TEXT"],
    ["tracking_url", "TEXT"],
    ["shipped_at", "DATETIME"],
    ["tracking_migrated", "INTEGER NOT NULL DEFAULT 0"],
    ["rejection_note", "TEXT"]
]) {
    if (!existingOrderColumns.has(column)) {
        db.exec(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
    }
}

// Manual tracking entries: admin adds only actual product/quantity shipment details.
db.exec(`
    CREATE TABLE IF NOT EXISTS order_tracking_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        courier_name TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        tracking_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
`);

// Existing orders that were already shipped before this feature is installed
// receive a fresh 10-day window, avoiding surprise immediate delivery.
if (addedShippedAtColumn) {
    db.prepare(`UPDATE orders SET shipped_at = CURRENT_TIMESTAMP
                WHERE order_status = 'shipped' AND shipped_at IS NULL`).run();
}

// Server-side automatic delivery: runs at startup and every 30 seconds.
function deliverExpiredShippedOrders() {
    try {
        const result = db.prepare(`
            UPDATE orders
            SET order_status = 'delivered', updated_at = CURRENT_TIMESTAMP
            WHERE order_status = 'shipped'
              AND shipped_at IS NOT NULL
              AND datetime(shipped_at, '+10 days') <= datetime('now')
        `).run();
        if (result.changes > 0) {
            console.log(`[Order timer] Automatically marked ${result.changes} order(s) as delivered.`);
        }
    } catch (error) {
        console.error('[Order timer] Automatic delivery check failed:', error.message);
    }
}
deliverExpiredShippedOrders();
const deliveryTimer = setInterval(deliverExpiredShippedOrders, 30 * 1000);
if (typeof deliveryTimer.unref === 'function') deliveryTimer.unref();

// GET dashboard statistics
router.get("/stats", requireAdmin, (req, res) => {
    try {
        const stats = {
            totalProducts: db.prepare("SELECT COUNT(*) AS total FROM products").get().total,
            totalCustomers: db.prepare("SELECT COUNT(*) AS total FROM users").get().total,
            totalOrders: db.prepare("SELECT COUNT(*) AS total FROM orders").get().total,
            pendingPayments: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE payment_status IN ('pending', 'submitted')").get().total,
            sectionCounts: {
                management: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE payment_status IN ('pending', 'submitted')").get().total,
                approved: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'approved' AND order_status = 'pending'").get().total,
                processing: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'approved' AND order_status = 'processing'").get().total,
                shipped: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE order_status = 'shipped' AND payment_status = 'approved'").get().total,
                rejected: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'rejected'").get().total,
                delivered: db.prepare("SELECT COUNT(*) AS total FROM orders WHERE order_status = 'delivered' AND payment_status != 'rejected'").get().total
            }
        };
        res.json({ success: true, stats });
    } catch (error) {
        console.error("Admin stats error:", error.message);
        res.status(500).json({ success: false, message: "Could not load dashboard statistics." });
    }
});

// Admin Customers & Orders workspace: each order includes its saved delivery address and items.
router.get("/customers", requireAdmin, (req, res) => {
    try {
        const q = String(req.query.q || "").trim().slice(0, 100);
        const status = String(req.query.status || "all").toLowerCase();
        const allowedStatuses = new Set(["all", "pending", "processing", "shipped", "delivered", "cancelled"]);
        if (!allowedStatuses.has(status)) return res.status(400).json({ success: false, message: "Invalid status filter." });
        const params = [];
        let where = "";
        if (status !== "all") { where += " AND LOWER(o.order_status) = ?"; params.push(status); }
        if (q) {
            where += " AND (CAST(o.id AS TEXT) LIKE ? OR LOWER(COALESCE(o.full_name,'')) LIKE ? OR LOWER(COALESCE(u.username,'')) LIKE ? OR COALESCE(o.phone,'') LIKE ?)";
            const term = `%${q.toLowerCase()}%`; params.push(term, term, term, `%${q}%`);
        }
        const orders = db.prepare(`SELECT o.id, o.user_id, o.total, o.payment_status, o.order_status,
            o.full_name, o.phone, o.province, o.city, o.postal_code, o.address,
            o.delivery_instructions, o.created_at, u.username AS customer_username
            FROM orders o LEFT JOIN users u ON u.id=o.user_id
            WHERE 1=1 ${where} ORDER BY o.id DESC`).all(...params);
        const itemsQuery = db.prepare("SELECT id, product_id, product_name, quantity, price FROM order_items WHERE order_id=? ORDER BY id ASC");
        res.json({ success: true, orders: orders.map(o => ({ ...o, items: itemsQuery.all(o.id) })) });
    } catch (error) {
        console.error("Admin customers/orders error:", error.message);
        res.status(500).json({ success: false, message: "Could not load customer orders." });
    }
});

// Tracking workspace: show Processing/Shipped orders so admin can manually add entries.
router.get("/tracking", requireAdmin, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT o.id AS order_id, o.user_id, o.full_name, o.phone,
                   o.payment_status, o.order_status, o.shipped_at,
                   o.created_at AS order_created_at, u.username AS customer_username
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE o.payment_status = 'approved'
              AND o.order_status IN ('processing', 'shipped')
            ORDER BY o.id DESC
        `).all();
        const entries = db.prepare(`
            SELECT t.id AS tracking_row_id, t.order_id, t.product_name, t.quantity,
                   t.courier_name, t.tracking_number, t.tracking_url,
                   t.created_at, t.updated_at
            FROM order_tracking_entries t
            ORDER BY t.order_id DESC, t.id ASC
        `).all();
        res.json({ success: true, orders, entries });
    } catch (error) {
        console.error("Tracking list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load tracking workspace." });
    }
});

router.post("/tracking", requireAdmin, (req, res) => {
    try {
        const orderId = Number(req.body.order_id);
        const productName = String(req.body.product_name || "").trim();
        const quantity = Number(req.body.quantity);
        const courierName = String(req.body.courier_name || "").trim();
        const trackingNumber = String(req.body.tracking_number || "").trim();
        const trackingUrl = String(req.body.tracking_url || "").trim();
        if (!Number.isSafeInteger(orderId) || orderId < 1) return res.status(400).json({ success: false, message: "Order select karein." });
        if (!productName || !courierName || !trackingNumber) return res.status(400).json({ success: false, message: "Product name, courier company aur tracking ID fill karein." });
        if (!Number.isSafeInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: "Quantity kam az kam 1 honi chahiye." });
        if (trackingUrl) {
            try { const parsed = new URL(trackingUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol"); }
            catch { return res.status(400).json({ success: false, message: "Tracking link valid http/https URL hona chahiye." }); }
        }
        const order = db.prepare("SELECT id, payment_status, order_status FROM orders WHERE id = ?").get(orderId);
        if (!order || order.payment_status !== "approved" || order.order_status !== "shipped") {
            return res.status(400).json({ success: false, message: "Tracking sirf Shipped order par add kar sakte hain. Pehle order ko Shipped mark karein." });
        }
        const result = db.prepare(`
            INSERT INTO order_tracking_entries
                (order_id, product_name, quantity, courier_name, tracking_number, tracking_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(orderId, productName, quantity, courierName, trackingNumber, trackingUrl || null);
        res.json({ success: true, message: "Tracking entry save ho gayi.", tracking_id: result.lastInsertRowid });
    } catch (error) {
        console.error("Tracking create error:", error.message);
        res.status(500).json({ success: false, message: "Could not save tracking entry." });
    }
});

router.patch("/tracking/:trackingId", requireAdmin, (req, res) => {
    try {
        const trackingId = Number(req.params.trackingId);
        const productName = String(req.body.product_name || "").trim();
        const quantity = Number(req.body.quantity);
        const courierName = String(req.body.courier_name || "").trim();
        const trackingNumber = String(req.body.tracking_number || "").trim();
        const trackingUrl = String(req.body.tracking_url || "").trim();
        if (!Number.isSafeInteger(trackingId) || trackingId < 1) return res.status(400).json({ success: false, message: "Invalid tracking entry." });
        if (!productName || !courierName || !trackingNumber) return res.status(400).json({ success: false, message: "Product name, courier company aur tracking ID fill karein." });
        if (!Number.isSafeInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: "Quantity kam az kam 1 honi chahiye." });
        if (trackingUrl) {
            try { const parsed = new URL(trackingUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol"); }
            catch { return res.status(400).json({ success: false, message: "Tracking link valid http/https URL hona chahiye." }); }
        }
        const result = db.prepare(`
            UPDATE order_tracking_entries
            SET product_name=?, quantity=?, courier_name=?, tracking_number=?,
                tracking_url=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `).run(productName, quantity, courierName, trackingNumber, trackingUrl || null, trackingId);
        if (!result.changes) return res.status(404).json({ success: false, message: "Tracking entry nahi mili." });
        res.json({ success: true, message: "Tracking entry update ho gayi." });
    } catch (error) {
        console.error("Tracking update error:", error.message);
        res.status(500).json({ success: false, message: "Could not update tracking entry." });
    }
});

router.delete("/tracking/:trackingId", requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.trackingId);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, message: "Invalid tracking entry." });
        const result = db.prepare("DELETE FROM order_tracking_entries WHERE id = ?").run(id);
        if (!result.changes) return res.status(404).json({ success: false, message: "Tracking entry nahi mili." });
        res.json({ success: true, message: "Tracking entry delete ho gayi." });
    } catch (error) {
        console.error("Tracking delete error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete tracking entry." });
    }
});

// GET orders filtered by section
router.get("/", requireAdmin, (req, res) => {
    try {
        const section = req.query.section || "management";
        const sectionConditions = {
            management: "o.payment_status IN ('pending', 'submitted')",
            approved: "o.payment_status = 'approved' AND o.order_status = 'pending'",
            processing: "o.payment_status = 'approved' AND o.order_status = 'processing'",
            shipped: "o.payment_status = 'approved' AND o.order_status = 'shipped'",
            rejected: "o.payment_status = 'rejected'",
            delivered: "o.order_status = 'delivered' AND o.payment_status != 'rejected'",
            all: "1 = 1"
        };

        if (!Object.prototype.hasOwnProperty.call(sectionConditions, section)) {
            return res.status(400).json({ success: false, message: "Invalid orders section." });
        }

        const orders = db.prepare(`
            SELECT
                o.id, o.user_id, o.total, o.payment_status, o.rejection_note,
                o.order_status, o.receipt_path, o.full_name, o.phone,
                o.province, o.city, o.postal_code, o.address,
                o.delivery_instructions, o.courier_name, o.tracking_number,
                o.tracking_url, o.shipped_at, o.created_at,
                u.username AS customer_username,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE ${sectionConditions[section]}
            ORDER BY o.id ASC
        `).all();

        res.json({ success: true, section, orders });
    } catch (error) {
        console.error("Admin orders list error:", error.message);
        res.status(500).json({ success: false, message: "Could not load orders." });
    }
});

// GET one order with its products
router.get("/:id", requireAdmin, (req, res) => {
    try {
        const orderId = Number(req.params.id);
        if (!Number.isSafeInteger(orderId) || orderId < 1) {
            return res.status(400).json({ success: false, message: "Invalid order ID." });
        }

        const order = db.prepare(`
            SELECT o.*, u.username AS customer_username
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE o.id = ?
        `).get(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        const items = db.prepare(`
            SELECT id, product_id, product_name, quantity, price
            FROM order_items WHERE order_id = ? ORDER BY id ASC
        `).all(orderId);

        res.json({ success: true, order: { ...order, items } });
    } catch (error) {
        console.error("Admin order details error:", error.message);
        res.status(500).json({ success: false, message: "Could not load order details." });
    }
});

// APPROVE or REJECT a submitted payment receipt.
// Rejections require a reason; that reason is returned to the customer.
router.patch("/:id/payment", requireAdmin, (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const paymentStatus = req.body.payment_status;
        const rejectionNote = String(req.body.rejection_note || "").trim();

        if (!Number.isSafeInteger(orderId) || orderId < 1) {
            return res.status(400).json({ success: false, message: "Invalid order ID." });
        }
        if (!["approved", "rejected"].includes(paymentStatus)) {
            return res.status(400).json({ success: false, message: "Payment status must be approved or rejected." });
        }
        if (paymentStatus === "rejected" && !rejectionNote) {
            return res.status(400).json({ success: false, message: "Payment reject karne ke liye reason zaroor likhein." });
        }

        const order = db.prepare(`
            SELECT id, payment_status, receipt_path FROM orders WHERE id = ?
        `).get(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        if (order.payment_status !== "submitted" || !order.receipt_path) {
            return res.status(400).json({
                success: false,
                message: "Only orders with a submitted receipt can be reviewed."
            });
        }

        db.prepare(`
            UPDATE orders
            SET payment_status = ?, rejection_note = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(paymentStatus, paymentStatus === "rejected" ? rejectionNote : null, orderId);

        res.json({
            success: true,
            message: paymentStatus === "approved"
                ? "Payment approved."
                : "Payment rejected. Reason customer ke order history mein nazar aayega.",
            payment_status: paymentStatus,
            rejection_note: paymentStatus === "rejected" ? rejectionNote : null
        });
    } catch (error) {
        console.error("Payment review error:", error.message);
        res.status(500).json({ success: false, message: "Could not update payment status." });
    }
});

// UPDATE order status. Shipped starts the 10-day timer; tracking is entered afterward.
router.patch("/:id/status", requireAdmin, (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const { order_status } = req.body;
        const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

        if (!Number.isSafeInteger(orderId) || orderId < 1) return res.status(400).json({ success: false, message: "Invalid order ID." });
        if (!allowedStatuses.includes(order_status)) return res.status(400).json({ success: false, message: "Invalid order status." });

        const order = db.prepare("SELECT id, payment_status, order_status FROM orders WHERE id = ?").get(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        if (["processing", "shipped", "delivered"].includes(order_status) && order.payment_status !== "approved") {
            return res.status(400).json({ success: false, message: "Payment approve hone ke baad hi order process ya ship ho sakta hai." });
        }
        if (order_status === "processing" && !["pending", "processing"].includes(order.order_status)) {
            return res.status(400).json({ success: false, message: "Order ko Processing mein lane ke liye pehle Approved section mein hona chahiye." });
        }
        if (order_status === "shipped" && !["processing", "shipped"].includes(order.order_status)) {
            return res.status(400).json({ success: false, message: "Order ko pehle Processing mein move karein." });
        }
        if (order_status === "delivered" && !["shipped", "delivered"].includes(order.order_status)) {
            return res.status(400).json({ success: false, message: "Order ko Delivered karne se pehle Shipped mark karein." });
        }
        if (order.order_status === "delivered" && order_status === "shipped") {
            return res.status(400).json({ success: false, message: "Delivered order ko dobara Shipped nahi kiya ja sakta." });
        }

        db.prepare(`
            UPDATE orders
            SET order_status = ?,
                shipped_at = CASE
                    WHEN ? = 'shipped' THEN COALESCE(shipped_at, CURRENT_TIMESTAMP)
                    ELSE shipped_at
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(order_status, order_status, orderId);

        res.json({
            success: true,
            message: order_status === "shipped"
                ? "Order Shipped mark ho gaya. 10-day countdown start ho gaya; ab Tracking page ke Shipped tab mein details fill karein."
                : order_status === "delivered"
                    ? "Order manually Delivered mark ho gaya. Automatic timer ab is order ko change nahi karega."
                    : "Order status updated.",
            order_status
        });
    } catch (error) {
        console.error("Order status update error:", error.message);
        res.status(500).json({ success: false, message: "Could not update order status." });
    }
});

module.exports = router;
