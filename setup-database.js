const fs = require("fs");
const path = require("path");
const db = require("./database");

try {
    const schemaPath = path.join(__dirname, "database", "schema.sql");
    const seedPath = path.join(__dirname, "database", "seed.sql");

    db.exec(fs.readFileSync(schemaPath, "utf8"));

    if (fs.existsSync(seedPath)) {
        db.exec(fs.readFileSync(seedPath, "utf8"));
    }

    console.log("Database schema is ready.");
    console.log("Public starter catalogue is ready.");
    console.log("No customer accounts, orders, receipts, or support messages were imported.");
} catch (error) {
    console.error("Database setup failed:", error.message);
    process.exitCode = 1;
} finally {
    db.close();
}
