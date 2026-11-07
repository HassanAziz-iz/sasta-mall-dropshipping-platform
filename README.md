# 🛍️ Sasta Mall

**An Open-Source Dropshipping Platform**

Sasta Mall is an open-source dropshipping starter platform built with **Node.js, Express.js, SQLite, HTML, CSS, and JavaScript**.

It provides a customer-facing online storefront and an administration panel for managing products, categories, customers, orders, order tracking, and customer support.

The project is designed to provide a foundation for developers who want to explore, customize, and extend an e-commerce and dropshipping platform.

---

## 📸 Project Screenshots

Explore the Sasta Mall interface:

### 🏠 Home Page
![Sasta Mall Home Page](![Uploading Home page.png…]()
)

### 🛒 Products Page
![Sasta Mall Products Page](<img width="1260" height="583" alt="product page" src="https://github.com/user-attachments/assets/dd0c75a9-d57f-4008-84eb-48129947a811" />
)

### 👤 Customer Dashboard
![Customer Dashboard](<img width="1257" height="581" alt="customer dashboard" src="https://github.com/user-attachments/assets/f8d983e5-7d7e-4b43-b364-2e7ca56bb16b" />
)

### ⚙️ Admin Dashboard
![Admin Dashboard](<img width="1260" height="586" alt="admin pannel" src="https://github.com/user-attachments/assets/882c7b0d-95df-4b9d-bfc2-77f7de1681e8" />
)

### 💬 Customer Support Chat
![Customer Support Chat](<img width="1244" height="573" alt="customer support" src="https://github.com/user-attachments/assets/06d730f5-ac8c-44c0-9525-f94e1f37712d" />
)

---

## ✨ Features

### Customer Features
- Customer registration and login
- Personal customer dashboard
- Product catalogue and categories
- Product images and videos
- Shopping cart and checkout
- Order history
- Order status and tracking
- Delivery address management
- Customer support chat
- Screenshot attachments in support conversations

### Admin Features
- Admin authentication
- Admin dashboard
- Product management
- Category management
- Customer management
- Order management
- Order status management
- Order tracking
- Customer support conversations
- Customer inquiry management

### Technical Features
- Node.js and Express.js backend
- SQLite database
- Vanilla HTML, CSS, and JavaScript
- REST API routes
- Session-based authentication
- Password hashing with bcrypt
- Environment-based configuration

---

## 🧰 Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | Web application framework |
| SQLite | Database |
| better-sqlite3 | SQLite database integration |
| HTML5 | Website structure |
| CSS3 | Website styling |
| JavaScript | Frontend functionality |
| bcrypt | Password hashing |
| Git & GitHub | Version control |

---

## 📋 Requirements

- Node.js 20 or newer
- npm (included with Node.js)
- Git (optional, for cloning and contributing)

Check your installed versions:

```bash
node --version
npm --version
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/HassanAziz786/sasta-mall.git
cd sasta-mall
```

Alternatively, download the repository ZIP from GitHub and extract it.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

**Windows Command Prompt:**

```cmd
copy .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Open `.env` and replace `SESSION_SECRET` with a long, random, private value.

**Important:** Never commit your `.env` file to GitHub.

### 4. Initialize the database

```bash
npm run db:setup
```

This creates `database/store.db`, builds the database schema, and imports the public starter catalogue.

It does not import existing customer accounts, orders, payment receipts, or support conversations.

### 5. Create the default admin account

```bash
npm run admin:create
```

**Default local demo login:**

| Field | Value |
|---|---|
| Admin page | http://localhost:3000/admin/login.html |
| Username | `admin` |
| Password | `admin123123123` |

The admin creation script will not overwrite an existing admin account. If the account already exists, use the password-reset command below.

⚠️ **Security Warning:** These are public demo credentials. Change the admin password before exposing any instance to the public internet. Never reuse this password in a production deployment.

### 6. Start Sasta Mall

```bash
npm start
```

Open the customer storefront:

http://localhost:3000/

Open the admin login:

http://localhost:3000/admin/login.html

---

## 🛠️ Useful Commands

| Command | Purpose |
|---|---|
| `npm start` | Start the application |
| `npm run db:setup` | Create missing database tables and import starter catalogue |
| `npm run admin:create` | Create the default admin if it does not already exist |
| `npm run admin:reset` | Interactively set a new password for the `admin` account |

The database setup command uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE`; it does not delete existing records.

Back up your own database before making manual schema or data changes.

---

## 📁 Project Structure

```text
sasta-mall/
│
├── admin/                 # Admin panel pages and scripts
│
├── database/
│   ├── schema.sql         # Full database schema
│   └── seed.sql           # Public starter catalogue only
│
├── middleware/            # Authentication middleware
│
├── public/                # Customer-facing website and assets
│   ├── css/
│   ├── js/
│   └── uploads/
│       └── products/      # Public product catalogue media
│
├── routes/                # Express API routes
│
├── screenshots/           # Project screenshots
│
├── .env.example           # Environment variable template
├── .gitignore
├── create-admin.js
├── database.js
├── package.json
├── reset-admin-password.js
├── server.js
└── setup-database.js
```

---

## 🔐 Admin Password Reset

To change the default admin password, run:

```bash
npm run admin:reset
```

Enter a new password when prompted.

The password is stored as a bcrypt hash.

---

## ⚙️ Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `SESSION_SECRET` | Secret used to sign session cookies | Required; no default |

---

## 🗄️ Database and Uploaded Files

- SQLite database is created locally at `database/store.db`.
- The local database is intentionally excluded from Git.
- Public product media is stored under `public/uploads/products/`.
- Customer payment receipts are stored under `public/uploads/receipts/` and excluded from Git.
- Private support uploads are excluded from Git.
- Back up your own database and uploaded files regularly.

---

## 🤝 Contributing

Contributions are welcome!

If you want to improve Sasta Mall, fix bugs, or add new features:

1. Fork this repository.
2. Create a new feature branch.
3. Make your changes.
4. Test your changes.
5. Submit a Pull Request.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

---

## 🔒 Security

Please do not commit:

- Passwords or API keys
- `.env` files
- Customer personal information
- Payment receipts
- Private support attachments
- Local database files

For security-related reports, please read [SECURITY.md](SECURITY.md).

---

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for details.

---

## ⭐ Support the Project

If you find Sasta Mall useful:

- Give this repository a ⭐ Star.
- Fork the project.
- Report bugs and suggest improvements.
- Contribute new features.

**Thank you for checking out Sasta Mall!** ❤️
