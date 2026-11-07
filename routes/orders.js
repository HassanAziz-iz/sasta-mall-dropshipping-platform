const express = require("express");
const db = require("../database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const receiptUploadDir = path.join(__dirname, "../public/uploads/receipts");
fs.mkdirSync(receiptUploadDir, { recursive: true });
// Safe migration: add rejection_note without deleting existing orders.
const orderColumns = new Set(
    db.prepare("PRAGMA table_info(orders)").all().map(column => column.name)
);

if (!orderColumns.has("rejection_note")) {
    db.exec("ALTER TABLE orders ADD COLUMN rejection_note TEXT");
}

// Make sure the admin tracking table exists for customer order history.
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
    )
`);

// =========================================
// RECEIPT UPLOAD CONFIGURATION
// =========================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            receiptUploadDir
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        if (file.mimetype.startsWith("image/")) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only image files are allowed."
                )
            );

        }

    }

});


// =========================================
// CREATE ORDER
// =========================================

router.post("/", (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({
                success: false,
                error: "Please login before placing an order."
            });

        }


        const user = db.prepare(`
            SELECT id, name, phone
            FROM users
            WHERE id = ?
        `).get(req.session.userId);


        if (!user) {

            return res.status(401).json({
                success: false,
                error: "User account not found."
            });

        }


        const {
            fullName,
            phone,
            province,
            city,
            postalCode,
            address,
            deliveryInstructions,
            cart
        } = req.body;


        if (
            !fullName ||
            !phone ||
            !province ||
            !city ||
            !postalCode ||
            !address
        ) {

            return res.status(400).json({
                success: false,
                error: "All required delivery fields must be filled."
            });

        }


        if (!/^\d{5}$/.test(postalCode)) {

            return res.status(400).json({
                success: false,
                error: "Postal code must be exactly 5 digits."
            });

        }


        if (!Array.isArray(cart) || cart.length === 0) {

            return res.status(400).json({
                success: false,
                error: "Your cart is empty."
            });

        }


        const getProduct = db.prepare(`
            SELECT
                id,
                name,
                price,
                stock
            FROM products
            WHERE id = ?
            AND active = 1
        `);


        const orderItems = [];

        let total = 0;


        for (const cartItem of cart) {

            const productId =
                Number(cartItem.id);

            const quantity =
                Number(cartItem.quantity);


            if (
                !Number.isInteger(productId) ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    error: "Invalid cart item."
                });

            }


            const product =
                getProduct.get(productId);


            if (!product) {

                return res.status(400).json({
                    success: false,
                    error:
                        `Product ${productId} is no longer available.`
                });

            }


            if (quantity > product.stock) {

                return res.status(400).json({
                    success: false,
                    error:
                        `${product.name} does not have enough stock.`
                });

            }


            const itemTotal =
                product.price * quantity;


            total += itemTotal;


            orderItems.push({

                productId:
                    product.id,

                productName:
                    product.name,

                quantity:
                    quantity,

                price:
                    product.price

            });

        }


        
const createOrder = db.prepare(`
    INSERT INTO orders (
        user_id,
        total,
        payment_status,
        rejection_note,
        order_status,
        full_name,
        phone,
        province,
        city,
        postal_code,
        address,
        delivery_instructions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const createOrderItem = db.prepare(`
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        quantity,
        price
    )
    VALUES (?, ?, ?, ?, ?)
`);

const saveOrder = db.transaction(() => {
    const orderResult = createOrder.run(
        user.id,
        total,
        "pending",
        null,
        "pending",
        fullName.trim(),
        phone.trim(),
        province.trim(),
        city.trim(),
        postalCode.trim(),
        address.trim(),
        deliveryInstructions
            ? deliveryInstructions.trim()
            : null
    );

    const orderId = orderResult.lastInsertRowid;

    for (const item of orderItems) {
        createOrderItem.run(
            orderId,
            item.productId,
            item.productName,
            item.quantity,
            item.price
        );
    }

    return orderId;
});


        const orderId =
            saveOrder();


        res.json({

            success: true,

            message:
                "Order created successfully.",

            orderId:
                orderId,

            total:
                total

        });


    } catch (error) {

        console.error(
            "Create order error:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                "Could not create order."

        });

    }

});


// =========================================
// UPLOAD PAYMENT RECEIPT
// =========================================

router.post(
    "/:id/receipt",
    (req, res, next) => {

        upload.single("receipt")(req, res, function(error) {

            if (error) {

                console.error(
                    "Multer upload error:",
                    error
                );

                return res.status(400).json({
                    success: false,
                    error: error.message
                });

            }

            next();

        });

    },

    (req, res) => {

        try {

            if (!req.session.userId) {

                return res.status(401).json({
                    success: false,
                    error: "Please login first."
                });

            }


            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: "Please upload a receipt image."
                });

            }


            const order = db.prepare(`
                SELECT
                    id,
                    payment_status
                FROM orders
                WHERE id = ?
                AND user_id = ?
            `).get(
                req.params.id,
                req.session.userId
            );


            if (!order) {

                return res.status(404).json({
                    success: false,
                    error: "Order not found."
                });

            }


            const receiptPath =
                "/uploads/receipts/" +
                req.file.filename;


            db.prepare(`
                UPDATE orders
                SET
                    receipt_path = ?,
                    payment_status = 'submitted',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                AND user_id = ?
            `).run(
                receiptPath,
                order.id,
                req.session.userId
            );


            res.json({
                success: true,
                message:
                    "Payment receipt uploaded successfully."
            });


        } catch (error) {

            console.error(
                "Receipt upload error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Could not upload payment receipt."
            });

        }

    }
);

// =========================================
// CUSTOMER ORDER HISTORY (logged-in user's orders only)
// =========================================
// CUSTOMER ORDER HISTORY — logged-in user's orders only
router.get("/mine", (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                error: "Please login first."
            });
        }

        const orders = db.prepare(`
            SELECT id, total, payment_status, rejection_note,
                   order_status, full_name, phone, province, city,
                   postal_code, address, delivery_instructions, created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.session.userId);

        const itemsQuery = db.prepare(`
            SELECT id, product_id, product_name, quantity, price
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
        `);

        const adminTrackingQuery = db.prepare(`
            SELECT id, product_name, quantity,
                   courier_name, tracking_number, tracking_url
            FROM order_tracking_entries
            WHERE order_id = ?
            ORDER BY id ASC
        `);

        const legacyTrackingQuery = db.prepare(`
            SELECT t.id, t.unit_number, t.quantity_covered,
                   t.courier_name, t.tracking_number, t.tracking_url,
                   oi.product_name
            FROM order_item_tracking t
            JOIN order_items oi ON oi.id = t.order_item_id
            WHERE t.order_id = ?
              AND TRIM(COALESCE(t.courier_name, '')) != ''
              AND TRIM(COALESCE(t.tracking_number, '')) != ''
            ORDER BY oi.id ASC, t.unit_number ASC
        `);

        const result = orders.map(order => {
            const adminTracking = adminTrackingQuery.all(order.id);
            const legacyTracking = legacyTrackingQuery.all(order.id);

            return {
                ...order,
                items: itemsQuery.all(order.id),
                tracking: [...adminTracking, ...legacyTracking]
            };
        });

        res.json({ success: true, orders: result });
    } catch (error) {
        console.error("Customer order history error:", error.message);
        res.status(500).json({
            success: false,
            error: "Could not load your orders."
        });
    }
});

// Customers may edit saved delivery details until the order has shipped.
router.patch("/:id/delivery", (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, error: "Please login first." });
        }
        const orderId = Number(req.params.id);
        if (!Number.isSafeInteger(orderId) || orderId < 1) {
            return res.status(400).json({ success: false, error: "Invalid order." });
        }
        const order = db.prepare("SELECT id, order_status FROM orders WHERE id = ? AND user_id = ?")
            .get(orderId, req.session.userId);
        if (!order) return res.status(404).json({ success: false, error: "Order not found." });
        if (["shipped", "delivered"].includes(String(order.order_status || "").toLowerCase())) {
            return res.status(409).json({ success: false, error: "This order has shipped, so delivery details can no longer be edited. Please contact Customer Support." });
        }
        const fullName = String(req.body.fullName || "").trim();
        const phone = String(req.body.phone || "").trim();
        const province = String(req.body.province || "").trim();
        const city = String(req.body.city || "").trim();
        const postalCode = String(req.body.postalCode || "").trim();
        const address = String(req.body.address || "").trim();
        const deliveryInstructions = String(req.body.deliveryInstructions || "").trim();
        if (!fullName || !phone || !province || !city || !postalCode || !address) {
            return res.status(400).json({ success: false, error: "Please complete all required delivery fields." });
        }
        if (!/^\d{5}$/.test(postalCode)) {
            return res.status(400).json({ success: false, error: "Postal code must be exactly 5 digits." });
        }
        db.prepare(`UPDATE orders SET full_name=?, phone=?, province=?, city=?, postal_code=?, address=?, delivery_instructions=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND lower(order_status) NOT IN ('shipped','delivered')`)
            .run(fullName, phone, province, city, postalCode, address, deliveryInstructions || null, orderId, req.session.userId);
        const updated = db.prepare(`SELECT id, total, payment_status, order_status, full_name, phone, province, city, postal_code, address, delivery_instructions, created_at FROM orders WHERE id=? AND user_id=?`).get(orderId, req.session.userId);
        res.json({ success: true, message: "Delivery details updated.", order: updated });
    } catch (error) {
        console.error("Delivery details update error:", error.message);
        res.status(500).json({ success: false, error: "Could not update delivery details." });
    }
});

// =========================================
// GET SINGLE ORDER
// =========================================

router.get("/:id", (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                error:
                    "Please login first."

            });

        }


        const order =
            db.prepare(`
                SELECT
                    id,
                    user_id,
                    total,
                    payment_status,
                    order_status,
                    full_name,
                    phone,
                    province,
                    city,
                    postal_code,
                    address,
                    delivery_instructions,
                    receipt_path,
                    courier_name,
                    tracking_number,
                    tracking_url,
                    shipped_at,
                    created_at
                FROM orders
                WHERE id = ?
                AND user_id = ?
            `).get(
                req.params.id,
                req.session.userId
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                error:
                    "Order not found."

            });

        }


        const items =
            db.prepare(`
                SELECT
                    id,
                    product_id,
                    product_name,
                    quantity,
                    price
                FROM order_items
                WHERE order_id = ?
                ORDER BY id ASC
            `).all(order.id);

        const tracking = db.prepare(`
            SELECT t.id, t.unit_number, t.quantity_covered, t.courier_name,
                   t.tracking_number, t.tracking_url, oi.product_name
            FROM order_item_tracking t
            JOIN order_items oi ON oi.id = t.order_item_id
            WHERE t.order_id = ?
              AND TRIM(COALESCE(t.courier_name, '')) != ''
              AND TRIM(COALESCE(t.tracking_number, '')) != ''
            ORDER BY oi.id ASC, t.unit_number ASC
        `).all(order.id);

        res.json({

            success: true,

            order: {

                ...order,

                items,
                tracking

            }

        });


    } catch (error) {

        console.error(
            "Get order error:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                "Could not load order."

        });

    }

});


module.exports = router;