const db = require("./database");
const bcrypt = require("bcrypt");

const username = "admin";
const password = "admin123123123";
const name = "Sasta Mall Admin";

async function createAdmin() {
    try {
        const existingAdmin = db
            .prepare("SELECT id FROM admins WHERE username = ?")
            .get(username);

        if (existingAdmin) {
            console.log("Admin username already exists; no changes were made.");
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(`
            INSERT INTO admins (username, password_hash, name)
            VALUES (?, ?, ?)
        `).run(username, passwordHash, name);

        console.log("Default admin account created successfully.");
        console.log("Username: admin");
        console.log("Password: admin123123123");
        console.log("IMPORTANT: Change this public demo password before any internet deployment.");
    } catch (error) {
        console.error("Failed to create admin:", error.message);
        process.exitCode = 1;
    } finally {
        db.close();
    }
}

createAdmin();
