-- Sasta Mall database schema. Contains no customer or order records.

CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE order_item_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        order_item_id INTEGER NOT NULL,
        unit_number INTEGER NOT NULL,
        quantity_covered INTEGER NOT NULL DEFAULT 1,
        courier_name TEXT,
        tracking_number TEXT,
        tracking_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
        UNIQUE(order_item_id, unit_number)
    );

CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

CREATE TABLE order_tracking_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        courier_name TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        tracking_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total INTEGER NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        order_status TEXT NOT NULL DEFAULT 'pending',
        receipt_path TEXT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        province TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        delivery_instructions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, postal_code TEXT, courier_name TEXT, tracking_number TEXT, tracking_url TEXT, shipped_at DATETIME, tracking_migrated INTEGER NOT NULL DEFAULT 0, rejection_note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

CREATE TABLE product_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
        file_path TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        category_id INTEGER,
        stock INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, specifications TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );

CREATE TABLE support_conversations (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   user_id INTEGER NOT NULL UNIQUE,
   status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
   admin_last_read_at TEXT,
   admin_last_read_message_id INTEGER NOT NULL DEFAULT 0,
   user_last_read_at TEXT,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, user_last_read_message_id INTEGER NOT NULL DEFAULT 0,
   FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
 );

CREATE TABLE support_messages (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   conversation_id INTEGER NOT NULL,
   sender_type TEXT NOT NULL CHECK(sender_type IN ('customer','admin')),
   sender_id INTEGER NOT NULL,
   body TEXT NOT NULL DEFAULT '',
   attachment_name TEXT,
   attachment_key TEXT UNIQUE,
   attachment_mime TEXT,
   attachment_size INTEGER,
   sent_at_ms INTEGER NOT NULL DEFAULT 0,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY(conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE
 );

CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_support_conversations_updated ON support_conversations(updated_at DESC);

CREATE INDEX idx_support_messages_conversation ON support_messages(conversation_id, id);
