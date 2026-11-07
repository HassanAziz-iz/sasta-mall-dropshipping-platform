-- Optional starter catalogue only. No users, admins, orders, receipts, or support conversations.
-- Public demo catalogue: categories
INSERT OR IGNORE INTO "categories" ("id", "name", "description", "active", "created_at") VALUES (1, 'Tech', 'Technology and useful gadgets', 1, '2026-10-07 21:02:40');
INSERT OR IGNORE INTO "categories" ("id", "name", "description", "active", "created_at") VALUES (2, 'Watches', 'Watches and accessories', 1, '2026-10-07 21:02:40');
INSERT OR IGNORE INTO "categories" ("id", "name", "description", "active", "created_at") VALUES (3, 'Home', 'Useful products for home', 1, '2026-10-07 21:02:40');
INSERT OR IGNORE INTO "categories" ("id", "name", "description", "active", "created_at") VALUES (7, 'Rings', 'For both men or women', 1, '2026-10-12 11:04:40');
INSERT OR IGNORE INTO "categories" ("id", "name", "description", "active", "created_at") VALUES (8, 'Fashion', 'Fashions like the best and beautiful things that adds charm more and more in humans..', 1, '2026-10-12 11:05:46');

-- Public demo catalogue: products
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (1, 'Wireless Earbuds', 'Affordable wireless earbuds with charging case', 1499, 1, 20, 0, '2026-10-07 21:39:19', '2026-10-12 11:06:40', NULL);
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (2, 'Crystal Watch eyer glasses', 'great watch', 1500, 2, 10, 1, '2026-10-08 20:59:57', '2026-10-12 09:22:56', 'black');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (3, 'ladies watch', 'crsytal clear watch', 608, 2, 21, 1, '2026-10-11 05:50:05', '2026-10-11 05:50:05', '');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (4, 'new ladies red watch', 'beautiful watch', 600, 2, 50, 1, '2026-10-11 06:01:42', '2026-10-11 06:02:20', '');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (5, 'Projector', 'great product', 600, 2, 50, 1, '2026-10-11 06:07:14', '2026-10-11 06:07:14', '');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (6, 'Girls ring', 'women''s ring', 150, 7, 33, 1, '2026-10-12 11:11:26', '2026-10-12 13:11:37', '');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (7, 'neckless', 'great product', 400, 8, 44, 1, '2026-10-12 19:11:25', '2026-10-12 19:11:25', '');
INSERT OR IGNORE INTO "products" ("id", "name", "description", "price", "category_id", "stock", "active", "created_at", "updated_at", "specifications") VALUES (8, 'headphones', 'headphoes', 317, 1, 29, 1, '2026-10-12 19:13:26', '2026-10-12 19:13:26', 'black colour');

-- Public demo catalogue: product_media
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (1, 2, 'image', '/uploads/products/1791493197410-6ace727ac20f5fc3fcf6de3b.png', 1, '2026-10-08 20:59:57');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (4, 2, 'video', '/uploads/products/1791661703277-420d89041b3a9c0627c06be4.mp4', 1, '2026-10-10 19:48:23');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (5, 3, 'image', '/uploads/products/1791697804953-460279d8e71349f505dbc53a.png', 1, '2026-10-11 05:50:05');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (6, 4, 'image', '/uploads/products/1791698502155-1795735e5e09e684945f6754.png', 1, '2026-10-11 06:01:42');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (7, 4, 'image', '/uploads/products/1791698540156-9d39656467688842164cb977.png', 2, '2026-10-11 06:02:20');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (8, 5, 'image', '/uploads/products/1791698834644-0521b47346bc8c99cec0276d.png', 1, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (9, 5, 'image', '/uploads/products/1791698834676-ca38e58748632e92e6f35f9e.png', 2, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (10, 5, 'image', '/uploads/products/1791698834692-73bcb0bf7b4421c35e9d8429.png', 3, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (11, 5, 'image', '/uploads/products/1791698834705-d74ada6dcb4866311e27a251.png', 4, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (12, 5, 'image', '/uploads/products/1791698834719-c51299d811d8335a50d94e2f.png', 5, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (13, 5, 'image', '/uploads/products/1791698834731-2e2f4e9a2a3bb874ef90cc36.png', 6, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (14, 5, 'video', '/uploads/products/1791698834752-6ac5bd7afd017dbbadefb83f.mp4', 1, '2026-10-11 06:07:14');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (15, 6, 'image', '/uploads/products/1791803486855-8ae3209f8096009d39d7e663.jpg', 1, '2026-10-12 11:11:26');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (16, 6, 'image', '/uploads/products/1791803530664-fb59763fc05d03297991950d.jpg', 2, '2026-10-12 11:12:10');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (17, 7, 'image', '/uploads/products/1791832285711-8ec2e17271b7b08092646fe1.jpg', 1, '2026-10-12 19:11:25');
INSERT OR IGNORE INTO "product_media" ("id", "product_id", "media_type", "file_path", "sort_order", "created_at") VALUES (18, 8, 'image', '/uploads/products/1791832406560-4b8f9226b6697c9922d6dc51.jpg', 1, '2026-10-12 19:13:26');
