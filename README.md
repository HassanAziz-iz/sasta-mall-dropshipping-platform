# Sasta Mall

An open-source e-commerce starter project built with **Node.js**, **Express**, **SQLite**, and vanilla HTML, CSS, and JavaScript.

Sasta Mall includes a customer-facing storefront and an admin panel for managing products, categories, orders, customers, tracking, and customer-support conversations.

## Features

- Customer registration, login, and account dashboard
- Product catalogue, categories, product images, and videos
- Shopping cart and checkout
- Order history and order status tracking
- Admin dashboard and management pages
- Customer and order management
- Customer-support chat with image attachments
- SQLite database with a starter product catalogue

## Requirements

- Node.js 20 or newer
- npm (included with Node.js)
- Git (optional, for cloning and contributing)

Check your versions:

```bash
node --version
npm --version
```

## Installation

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd sasta-mall
```

Alternatively, download the repository ZIP from GitHub and extract it.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

On Windows Command Prompt:

```cmd
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Open `.env` and replace `SESSION_SECRET` with a long, random, private value. Do not commit `.env` to GitHub.

### 4. Initialize the database

```bash
npm run db:setup
```

This creates `database/store.db`, builds the full database schema, and imports the public starter catalogue. It does not import customer accounts, orders, payment receipts, or support conversations.

### 5. Create the default admin account

```bash
npm run admin:create
```

Default local demo login:

| Field | Value |
|---|---|
| Admin page | `http://localhost:3000/admin/login.html` |
| Username | `admin` |
| Password | `admin123123123` |

The admin creation script will not overwrite an existing admin account. If the account already exists, use the password-reset command below.

**Security warning:** These are public demo credentials. Change the admin password before exposing any instance to the public internet. Do not reuse this password on a production deployment.

### 6. Start Sasta Mall

```bash
npm start
```

Open the customer storefront:

- <http://localhost:3000/>

Open the admin login:

- <http://localhost:3000/admin/login.html>

## Useful commands

| Command | Purpose |
|---|---|
| `npm start` | Start the application |
| `npm run db:setup` | Create missing database tables and import starter catalogue rows |
| `npm run admin:create` | Create the default admin if it does not already exist |
| `npm run admin:reset` | Interactively set a new password for the `admin` account |

The database setup command uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE`; it does not delete existing records. Back up your own database before making manual schema or data changes.

## Project structure

```text
sasta-mall/
├── admin/                 # Admin panel pages and scripts
├── database/
│   ├── schema.sql         # Full database schema
│   └── seed.sql           # Public starter catalogue only
├── middleware/            # Authentication middleware
├── public/                # Customer-facing website and public assets
│   ├── css/
│   ├── js/
│   └── uploads/products/  # Public product catalogue media
├── routes/                # Express API routes
├── .env.example           # Environment variable template
├── .gitignore
├── create-admin.js
├── database.js
├── package.json
├── reset-admin-password.js
├── server.js
└── setup-database.js
```

## Admin password reset

Run:

```bash
npm run admin:reset
```

Enter a new password when prompted. The password is stored as a bcrypt hash.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `SESSION_SECRET` | Secret used to sign session cookies | No default; required |

## Database and uploaded files

- The SQLite database is created locally at `database/store.db`.
- The local database is intentionally excluded from Git.
- Public product media is stored under `public/uploads/products/`.
- Customer payment receipts are stored under `public/uploads/receipts/` and are excluded from Git.
- Private support uploads are excluded from Git.
- Back up your own database and uploaded files regularly.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Please do not commit passwords, API keys, `.env` files, customer data, payment receipts, private support attachments, or local database files. See [SECURITY.md](SECURITY.md) for reporting guidance.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
