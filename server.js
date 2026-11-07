require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const multer = require("multer");

const db = require("./database");

const categoriesRouter = require("./routes/categories");
const productsRouter = require("./routes/products");
const authRouter = require("./routes/auth");
const ordersRouter = require("./routes/orders");
const adminAuthRouter = require("./routes/admin-auth");
const adminProductsRouter = require("./routes/admin-products");
const adminOrdersRouter = require("./routes/admin-orders");
const adminCategoriesRouter = require("./routes/admin-categories");
const supportRouter = require("./routes/support");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
    console.error("SESSION_SECRET is missing. Copy .env.example to .env and set a strong random value.");
    process.exit(1);
}

// =========================================
// MIDDLEWARE
// =========================================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// =========================================
// SESSION
// =========================================

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);

// =========================================
// RECEIPT UPLOAD
// =========================================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(
            null,
            path.join(
                __dirname,
                "public/uploads/receipts"
            )
        );
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only image files are allowed."
                )
            );
        }
    }
});

// =========================================
// SERVE WEBSITE
// =========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.use(
    "/admin",
    express.static(
        path.join(__dirname, "admin")
    )
);

// =========================================
// API ROUTES
// =========================================

app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);

app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/categories", adminCategoriesRouter);
app.use("/api/support", supportRouter);

// =========================================
// HOME
// =========================================

app.get("/", (req, res) => {
    res.send("Welcome to Sasta-mall!");
});

// =========================================
// DATABASE TEST
// =========================================

app.get("/api/test-db", (req, res) => {
    const result = db.prepare(
        "SELECT 1 AS working"
    ).get();

    res.json({
        success: true,
        database: result.working === 1
    });
});

// =========================================
// START SERVER
// =========================================

app.listen(PORT, () => {
    console.log(
        `Sasta-mall is running at http://localhost:${PORT}`
    );
});
