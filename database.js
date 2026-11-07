const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const databaseDirectory = path.join(__dirname, "database");
fs.mkdirSync(databaseDirectory, { recursive: true });

const dbPath = path.join(databaseDirectory, "store.db");
const db = new Database(dbPath);

console.log("Database connected successfully.");

module.exports = db;
