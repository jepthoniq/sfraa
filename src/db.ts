import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const db = new Database("sufra.db");

try {
  db.prepare("ALTER TABLE orders ADD COLUMN customer_ip TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE orders ADD COLUMN notes TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE items ADD COLUMN discount_price REAL").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE restaurants ADD COLUMN subscription_expires_at DATETIME").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE restaurants ADD COLUMN theme_color TEXT DEFAULT '#dc2626'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE restaurants ADD COLUMN subscription_started_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN dashboard_color TEXT DEFAULT '#dc2626'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE restaurants ADD COLUMN address TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE restaurants ADD COLUMN phone TEXT").run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    is_super_admin INTEGER DEFAULT 0,
    dashboard_color TEXT DEFAULT '#dc2626'
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    name TEXT,
    slug TEXT UNIQUE,
    logo TEXT,
    currency TEXT DEFAULT 'IQD',
    min_order REAL DEFAULT 0,
    is_delivery_enabled INTEGER DEFAULT 1,
    whatsapp_number TEXT,
    theme_color TEXT DEFAULT '#dc2626',
    subscription_status TEXT DEFAULT 'trial',
    subscription_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    subscription_expires_at DATETIME,
    address TEXT,
    phone TEXT,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    name TEXT,
    sort_order INTEGER,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    category_id TEXT,
    name TEXT,
    description TEXT,
    price REAL,
    discount_price REAL,
    image TEXT,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    name TEXT,
    fee REAL,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    type TEXT,
    status TEXT DEFAULT 'pending',
    subtotal REAL,
    delivery_fee REAL,
    total REAL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    customer_zone TEXT,
    google_maps_link TEXT,
    table_number TEXT,
    customer_ip TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    name TEXT,
    price REAL,
    quantity INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    sender TEXT,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS blocked_users (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, phone),
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS blocked_ips (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, ip),
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );
`);

export default db;