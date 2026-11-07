const express = require("express");
const db = require("../database");

const router = express.Router();

// Get products
router.get("/", (req, res) => {
    const categoryId = req.query.category;

    let products;

    if (categoryId) {
        products = db.prepare(`
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.category_id,
                p.stock,
                (
                    SELECT file_path
                    FROM product_media
                    WHERE product_id = p.id
                    AND media_type = 'image'
                    ORDER BY sort_order ASC
                    LIMIT 1
                ) AS image
            FROM products p
            WHERE p.active = 1
            AND p.category_id = ?
            ORDER BY p.created_at DESC
        `).all(categoryId);
    } else {
        products = db.prepare(`
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.category_id,
                p.stock,
                (
                    SELECT file_path
                    FROM product_media
                    WHERE product_id = p.id
                    AND media_type = 'image'
                    ORDER BY sort_order ASC
                    LIMIT 1
                ) AS image
            FROM products p
            WHERE p.active = 1
            ORDER BY p.created_at DESC
        `).all();
    }

    res.json(products);
});
// Get single product with all media
router.get("/:id", (req, res) => {

    const product = db.prepare(`
        SELECT
            id,
            name,
            description,
            price,
            category_id,
            stock
        FROM products
        WHERE id = ?
        AND active = 1
    `).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            error: "Product not found"
        });
    }

    const media = db.prepare(`
        SELECT
            id,
            media_type,
            file_path,
            sort_order
        FROM product_media
        WHERE product_id = ?
        ORDER BY
            CASE WHEN media_type = 'video' THEN 0 ELSE 1 END,
            sort_order ASC
    `).all(req.params.id);

    res.json({
        ...product,
        media
    });
});
module.exports = router;