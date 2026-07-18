import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'db', 'finance.db');

// Ensure database directory exists before initializing SQLite database
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    ticker TEXT,
    units REAL NOT NULL DEFAULT 0,
    avg_buy_price REAL NOT NULL DEFAULT 0,
    current_price REAL NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    monthly_limit REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pdf_passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_pattern TEXT NOT NULL UNIQUE,
    encrypted_password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    records_added INTEGER NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL
  );
`);

export default db;
