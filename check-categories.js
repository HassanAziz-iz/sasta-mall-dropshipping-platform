
const db = require("./database");

try {
    const categories = db.prepare(
        "SELECT id, name, active FROM categories ORDER BY id"
    ).all();

    console.log("Categories in database:");
    console.table(categories);
} catch (error) {
    console.error(error.message);
} finally {
    db.close();
}