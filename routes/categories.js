const express = require("express");
const db = require("../database");

const router = express.Router();

// Get all active categories
router.get("/", (req, res) => {
    const categories = db.prepare(`
        SELECT id, name, description
        FROM categories
        WHERE active = 1
        ORDER BY name ASC
    `).all();

    res.json(categories);
});

module.exports = router;