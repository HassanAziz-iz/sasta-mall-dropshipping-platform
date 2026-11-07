const express = require("express");
const db = require("../database");
const { requireAdmin } = require("../middleware/admin-auth");

const router = express.Router();

function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// List categories for the admin page, including product counts.
router.get("/", requireAdmin, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT c.id, c.name, c.description, c.active, c.created_at,
                   COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id, c.name, c.description, c.active, c.created_at
            ORDER BY c.name COLLATE NOCASE ASC
        `).all();
        return res.json(rows);
    } catch (error) {
        console.error("Admin categories list failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not load categories." });
    }
});

// Create a category.
router.post("/", requireAdmin, (req, res) => {
    const name = cleanText(req.body?.name);
    const description = cleanText(req.body?.description);

    if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required." });
    }
    if (name.length > 100) {
        return res.status(400).json({ success: false, message: "Category name must be 100 characters or fewer." });
    }
    if (description.length > 1000) {
        return res.status(400).json({ success: false, message: "Description must be 1000 characters or fewer." });
    }

    try {
        const result = db.prepare(`
            INSERT INTO categories (name, description, active)
            VALUES (?, ?, 1)
        `).run(name, description || null);
        return res.status(201).json({ success: true, message: "Category created successfully.", id: result.lastInsertRowid });
    } catch (error) {
        if (String(error.code || "").includes("CONSTRAINT") || /UNIQUE constraint failed/i.test(error.message)) {
            return res.status(409).json({ success: false, message: "A category with this name already exists." });
        }
        console.error("Admin category create failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not create category." });
    }
});

// Update a category.
router.put("/:id", requireAdmin, (req, res) => {
    const id = validId(req.params.id);
    const name = cleanText(req.body?.name);
    const description = cleanText(req.body?.description);

    if (!id) return res.status(400).json({ success: false, message: "Invalid category ID." });
    if (!name) return res.status(400).json({ success: false, message: "Category name is required." });
    if (name.length > 100) return res.status(400).json({ success: false, message: "Category name must be 100 characters or fewer." });
    if (description.length > 1000) return res.status(400).json({ success: false, message: "Description must be 1000 characters or fewer." });

    try {
        const result = db.prepare(`
            UPDATE categories SET name = ?, description = ? WHERE id = ?
        `).run(name, description || null, id);
        if (!result.changes) return res.status(404).json({ success: false, message: "Category not found." });
        return res.json({ success: true, message: "Category updated successfully." });
    } catch (error) {
        if (String(error.code || "").includes("CONSTRAINT") || /UNIQUE constraint failed/i.test(error.message)) {
            return res.status(409).json({ success: false, message: "A category with this name already exists." });
        }
        console.error("Admin category update failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not update category." });
    }
});

// Delete only when no products use this category; never cascade-delete products or order history.
router.delete("/:id", requireAdmin, (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid category ID." });

    try {
        const category = db.prepare("SELECT id, name FROM categories WHERE id = ?").get(id);
        if (!category) return res.status(404).json({ success: false, message: "Category not found." });

        const usage = db.prepare("SELECT COUNT(*) AS count FROM products WHERE category_id = ?").get(id);
        if (usage.count > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete "${category.name}" because ${usage.count} product(s) use it. Reassign those products first; this protects your product and order records.`
            });
        }

        db.prepare("DELETE FROM categories WHERE id = ?").run(id);
        return res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        console.error("Admin category delete failed:", error.message);
        return res.status(500).json({ success: false, message: "Could not delete category." });
    }
});

module.exports = router;
