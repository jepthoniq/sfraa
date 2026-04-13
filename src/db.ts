import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const db = new Database("sufra.db");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT
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
    subscription_status TEXT DEFAULT 'trial',
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
    type TEXT, -- 'dine-in' or 'delivery'
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
    sender TEXT, -- 'customer' or 'restaurant'
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
`);

export default db;
