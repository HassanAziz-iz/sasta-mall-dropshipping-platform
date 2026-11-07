const express = require("express");

const path = require("path");

const fs = require("fs");

const crypto = require("crypto");

const multer = require("multer");



const db = require("../database");

const { requireAdmin } = require("../middleware/admin-auth");



const router = express.Router();



const uploadDir = path.join(

    __dirname,

    "../public/uploads/products"

);



fs.mkdirSync(uploadDir, { recursive: true });



const storage = multer.diskStorage({

    destination: (req, file, cb) => cb(null, uploadDir),



    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname).toLowerCase();

        const safeName =

            Date.now() + "-" +

            crypto.randomBytes(12).toString("hex") +

            ext;



        cb(null, safeName);

    }

});



const allowedExtensions = {

    "image/jpeg": [".jpg", ".jpeg"],

    "image/png": [".png"],

    "image/webp": [".webp"],

    "image/gif": [".gif"],

    "video/mp4": [".mp4"],

    "video/webm": [".webm"],

    "video/quicktime": [".mov"]

};



const upload = multer({

    storage,

    limits: {

        fileSize: 20 * 1024 * 1024,

        files: 11

    },

    fileFilter: (req, file, cb) => {

        const allowed = allowedExtensions[file.mimetype] || [];

        const ext = path.extname(file.originalname).toLowerCase();



        if (allowed.includes(ext)) {

            cb(null, true);

        } else {

            cb(new Error(

                "Allowed files: JPG, PNG, WEBP, GIF, MP4, WEBM or MOV."

            ));

        }

    }

});



function removeUploadedFiles(files) {

    for (const file of files || []) {

        if (file?.path) {

            fs.unlink(file.path, () => {});

        }

    }

}



function handleProductUpload(req, res, next) {

    upload.fields([

        { name: "images", maxCount: 10 },

        { name: "video", maxCount: 1 }

    ])(req, res, error => {

        if (error) {

            removeUploadedFiles(

                Object.values(req.files || {}).flat()

            );



            return res.status(400).json({

                success: false,

                message: error.message

            });

        }



        next();

    });

}



function getUploadedFiles(req) {

    return [

        ...(req.files?.images || []),

        ...(req.files?.video || [])

    ];

}



function getProductId(value) {

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;

}



function validateProductFields(body) {

    const name = body.name;

    const description = body.description ?? "";

    const specifications = body.specifications ?? "";

    const price = Number(body.price);

    const stock = Number(body.stock);

    const categoryId = Number(body.category_id);



    if (

        typeof name !== "string" ||

        !name.trim() ||

        name.trim().length > 200 ||

        !Number.isSafeInteger(price) ||

        price < 0 ||

        !Number.isSafeInteger(stock) ||

        stock < 0 ||

        !Number.isSafeInteger(categoryId) ||

        categoryId < 1

    ) {

        return {

            error: "Enter a title, valid category, price and stock."

        };

    }



    if (

        typeof description !== "string" ||

        typeof specifications !== "string" ||

        description.length > 10000 ||

        specifications.length > 10000

    ) {

        return {

            error: "Description or specifications are too long."

        };

    }



    const category = db.prepare(`

        SELECT id

        FROM categories

        WHERE id = ? AND active = 1

    `).get(categoryId);



    if (!category) {

        return {

            error: "Select a valid active category."

        };

    }



    return {

        value: {

            name: name.trim(),

            description: description.trim(),

            specifications: specifications.trim(),

            price,

            stock,

            categoryId

        }

    };

}



function insertUploadedMedia(productId, req) {

    const images = req.files?.images || [];

    const videos = req.files?.video || [];



    const getNextOrder = db.prepare(`

        SELECT COALESCE(MAX(sort_order), 0) AS lastOrder

        FROM product_media

        WHERE product_id = ? AND media_type = ?

    `);



    const insertMedia = db.prepare(`

        INSERT INTO product_media (

            product_id, media_type, file_path, sort_order

        )

        VALUES (?, ?, ?, ?)

    `);



    let imageOrder = getNextOrder.get(productId, "image").lastOrder;

    let videoOrder = getNextOrder.get(productId, "video").lastOrder;



    for (const file of images) {

        imageOrder += 1;



        insertMedia.run(

            productId,

            "image",

            "/uploads/products/" + file.filename,

            imageOrder

        );

    }



    for (const file of videos) {

        videoOrder += 1;



        insertMedia.run(

            productId,

            "video",

            "/uploads/products/" + file.filename,

            videoOrder

        );

    }

}



// Get active categories for the admin product form

router.get("/categories", requireAdmin, (req, res) => {

    const categories = db.prepare(`

        SELECT id, name

        FROM categories

        WHERE active = 1

        ORDER BY name ASC

    `).all();



    res.json(categories);

});



// List products, including inactive products

router.get("/", requireAdmin, (req, res) => {

    const products = db.prepare(`

        SELECT

            p.id,

            p.name,

            p.description,

            p.specifications,

            p.price,

            p.category_id,

            p.stock,

            p.active,

            c.name AS category_name

        FROM products p

        LEFT JOIN categories c ON c.id = p.category_id

        ORDER BY p.created_at DESC

    `).all();



    const getMedia = db.prepare(`

        SELECT id, media_type, file_path, sort_order

        FROM product_media

        WHERE product_id = ?

        ORDER BY sort_order ASC, id ASC

    `);



    res.json(products.map(product => ({

        ...product,

        media: getMedia.all(product.id)

    })));

});



// Create product

router.post(

    "/",

    requireAdmin,

    handleProductUpload,

    (req, res) => {

        const files = getUploadedFiles(req);



        try {

            const validation = validateProductFields(req.body);



            if (validation.error) {

                removeUploadedFiles(files);



                return res.status(400).json({

                    success: false,

                    message: validation.error

                });

            }



            const product = validation.value;



            const createProduct = db.transaction(() => {

                const result = db.prepare(`

                    INSERT INTO products (

                        name, description, specifications,

                        price, category_id, stock, active

                    )

                    VALUES (?, ?, ?, ?, ?, ?, 1)

                `).run(

                    product.name,

                    product.description,

                    product.specifications,

                    product.price,

                    product.categoryId,

                    product.stock

                );



                const productId = Number(result.lastInsertRowid);



                insertUploadedMedia(productId, req);



                return productId;

            });



            const productId = createProduct();



            return res.status(201).json({

                success: true,

                message: "Product created successfully.",

                productId

            });

        } catch (error) {

            removeUploadedFiles(files);

            console.error("Admin product creation failed:", error.message);



            return res.status(500).json({

                success: false,

                message: "Could not save product."

            });

        }

    }

);



// Edit product details and optionally add media

router.put(

    "/:id",

    requireAdmin,

    handleProductUpload,

    (req, res) => {

        const files = getUploadedFiles(req);

        const productId = getProductId(req.params.id);



        try {

            if (!productId) {

                removeUploadedFiles(files);



                return res.status(400).json({

                    success: false,

                    message: "Invalid product ID."

                });

            }



            const exists = db.prepare(`

                SELECT id FROM products WHERE id = ?

            `).get(productId);



            if (!exists) {

                removeUploadedFiles(files);



                return res.status(404).json({

                    success: false,

                    message: "Product not found."

                });

            }



            const validation = validateProductFields(req.body);



            if (validation.error) {

                removeUploadedFiles(files);



                return res.status(400).json({

                    success: false,

                    message: validation.error

                });

            }



            const product = validation.value;



            const updateProduct = db.transaction(() => {

                db.prepare(`

                    UPDATE products

                    SET

                        name = ?,

                        description = ?,

                        specifications = ?,

                        price = ?,

                        category_id = ?,

                        stock = ?,

                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(

                    product.name,

                    product.description,

                    product.specifications,

                    product.price,

                    product.categoryId,

                    product.stock,

                    productId

                );



                insertUploadedMedia(productId, req);

            });



            updateProduct();



            return res.json({

                success: true,

                message: "Product updated successfully."

            });

        } catch (error) {

            removeUploadedFiles(files);

            console.error("Admin product update failed:", error.message);



            return res.status(500).json({

                success: false,

                message: "Could not update product."

            });

        }

    }

);



// Activate or deactivate a product

router.patch("/:id/status", requireAdmin, (req, res) => {

    const productId = getProductId(req.params.id);

    const active = req.body?.active;



    if (!productId || ![0, 1].includes(active)) {

        return res.status(400).json({

            success: false,

            message: "Provide a valid product ID and active value (0 or 1)."

        });

    }



    const result = db.prepare(`

        UPDATE products

        SET active = ?, updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `).run(active, productId);



    if (result.changes === 0) {

        return res.status(404).json({

            success: false,

            message: "Product not found."

        });

    }



    return res.json({

        success: true,

        message: active === 1

            ? "Product activated successfully."

            : "Product deactivated successfully.",

        active

    });

});



// Delete one existing image or video from a product.
router.delete("/:id/media/:mediaId", requireAdmin, (req, res) => {
    const productId = getProductId(req.params.id);
    const mediaId = getProductId(req.params.mediaId);

    if (!productId || !mediaId) {
        return res.status(400).json({
            success: false,
            message: "Invalid product or media ID."
        });
    }

    try {
        const media = db.prepare(`
            SELECT id, file_path
            FROM product_media
            WHERE id = ? AND product_id = ?
        `).get(mediaId, productId);

        if (!media) {
            return res.status(404).json({
                success: false,
                message: "Media not found for this product."
            });
        }

        const result = db.prepare(`
            DELETE FROM product_media
            WHERE id = ? AND product_id = ?
        `).run(mediaId, productId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Media was already removed."
            });
        }

        // Only remove files stored in this product's upload folder.
        if (
            typeof media.file_path === "string" &&
            media.file_path.startsWith("/uploads/products/")
        ) {
            const filename = path.basename(media.file_path);
            const filePath = path.join(uploadDir, filename);

            fs.unlink(filePath, error => {
                if (error && error.code !== "ENOENT") {
                    console.error("Could not remove media file:", error.message);
                }
            });
        }

        return res.json({
            success: true,
            message: "Media deleted successfully."
        });
    } catch (error) {
        console.error("Media deletion failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not delete this media."
        });
    }
});

// Delete only if product has never appeared in order_items.

// Otherwise deactivate it to preserve order history.

router.delete("/:id", requireAdmin, (req, res) => {

    const productId = getProductId(req.params.id);



    if (!productId) {

        return res.status(400).json({

            success: false,

            message: "Invalid product ID."

        });

    }



    try {

        const deleteProduct = db.transaction(() => {

            const product = db.prepare(`

                SELECT id FROM products WHERE id = ?

            `).get(productId);



            if (!product) {

                return { notFound: true };

            }



            const ordered = db.prepare(`

                SELECT 1

                FROM order_items

                WHERE product_id = ?

                LIMIT 1

            `).get(productId);



            if (ordered) {

                db.prepare(`

                    UPDATE products

                    SET active = 0, updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(productId);



                return { deactivated: true };

            }



            const media = db.prepare(`

                SELECT file_path

                FROM product_media

                WHERE product_id = ?

            `).all(productId);



            // Remove media records before the product row.

            // This also works when SQLite foreign keys are enabled.

            db.prepare(`

                DELETE FROM product_media

                WHERE product_id = ?

            `).run(productId);



            db.prepare(`

                DELETE FROM products

                WHERE id = ?

            `).run(productId);



            return { deleted: true, media };

        });



        const result = deleteProduct();



        if (result.notFound) {

            return res.status(404).json({

                success: false,

                message: "Product not found."

            });

        }



        if (result.deactivated) {

            return res.json({

                success: true,

                action: "deactivated",

                message: "This product has order history, so it was deactivated instead of deleted."

            });

        }



        // Remove local files only after the database transaction succeeds.

        for (const item of result.media) {

            const relativePath = item.file_path;



            if (

                typeof relativePath === "string" &&

                relativePath.startsWith("/uploads/products/")

            ) {

                const filename = path.basename(relativePath);

                const filePath = path.join(uploadDir, filename);



                fs.unlink(filePath, error => {

                    if (error && error.code !== "ENOENT") {

                        console.error(

                            "Could not remove product media:",

                            error.message

                        );

                    }

                });

            }

        }



        return res.json({

            success: true,

            action: "deleted",

            message: "Product deleted successfully."

        });

    } catch (error) {

        console.error("Admin product deletion failed:", error.message);



        return res.status(500).json({

            success: false,

            message: "Could not delete product."

        });

    }

});



module.exports = router;