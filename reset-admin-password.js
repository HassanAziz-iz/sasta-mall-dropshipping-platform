const db = require("./database");
const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter new admin password: ", async (password) => {
    try {
        if (!password || password.length < 8) {
            console.log("Password must be at least 8 characters.");
            rl.close();
            db.close();
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = db.prepare(`
            UPDATE admins
            SET password_hash = ?
            WHERE username = ?
        `).run(
            passwordHash,
            "admin"
        );

        if (result.changes === 0) {
            console.log("Admin account not found.");
        } else {
            console.log("Admin password changed successfully.");
        }

    } catch (error) {
        console.error("Failed to change admin password.");
        console.error(error.message);
    }

    rl.close();
    db.close();
});