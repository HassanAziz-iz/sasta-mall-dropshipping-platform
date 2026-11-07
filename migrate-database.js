const db = require("./database");

console.log("Starting database migration...");

try {
    db.prepare(`
        ALTER TABLE orders
        ADD COLUMN postal_code TEXT
    `).run();

    console.log("postal_code column added successfully.");
} catch (error) {

    if (error.message.includes("duplicate column name")) {
        console.log("postal_code column already exists.");
    } else {
        console.error("Migration failed:");
        console.error(error.message);
        process.exit(1);
    }
}

console.log("Database migration completed.");

db.close();