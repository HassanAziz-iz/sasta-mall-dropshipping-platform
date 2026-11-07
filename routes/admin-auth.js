const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../database");

const router = express.Router();


// ADMIN LOGIN
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        const admin = db.prepare(`
            SELECT
                id,
                username,
                password_hash,
                name,
                active
            FROM admins
            WHERE username = ?
        `).get(username);

        if (!admin || admin.active !== 1) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;

        return res.json({
            success: true,
            message: "Admin login successful.",
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name
            }
        });

    } catch (error) {
        console.error("Admin login error:");
        console.error(error.message);

        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
});


// ADMIN LOGOUT
router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({
            success: true
        });
    }

    req.session.adminId = null;
    req.session.adminUsername = null;

    req.session.save(() => {
        res.json({
            success: true,
            message: "Admin logged out."
        });
    });
});


// CHECK ADMIN LOGIN
router.get("/me", (req, res) => {
    if (!req.session || !req.session.adminId) {
        return res.json({
            loggedIn: false
        });
    }

    const admin = db.prepare(`
        SELECT
            id,
            username,
            name
        FROM admins
        WHERE id = ?
          AND active = 1
    `).get(req.session.adminId);

    if (!admin) {
        req.session.adminId = null;
        req.session.adminUsername = null;

        return res.json({
            loggedIn: false
        });
    }

    return res.json({
        loggedIn: true,
        admin: admin
    });
});


module.exports = router;