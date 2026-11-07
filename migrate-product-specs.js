
const db = require("./database");

try {
    const columns = db.prepare(
        "PRAGMA table_info(products)"
    ).all();

    if (!columns.some(column => column.name === "specifications")) {
        db.exec(
            "ALTER TABLE products ADD COLUMN specifications TEXT"
        );
        console.log("Specifications column added.");
    } else {
        console.log("Specifications column already exists.");
    }
} catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
} finally {
    db.close();
}
