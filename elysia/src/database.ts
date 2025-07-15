import { Database } from "bun:sqlite";
import { SQLITE_DB_PATH } from "./environment";

const database = new Database(SQLITE_DB_PATH, { create: true });

export function initializeDatabase() {
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA synchronous = normal;");

  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      correlationId TEXT NOT NULL,
      amount REAL NOT NULL,
      requestedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments_default (
      amount REAL NOT NULL,
      requestedAt TEX T NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments_fallback (
      amount REAL NOT NULL,
      requestedAt TEXT NOT NULL
    );
  `);
}

export const db = database;