import { db, initializeDatabase } from "./database";

export function purgeDatabase() {
  try {
    db.exec("DROP TABLE IF EXISTS payment_queue;");
    db.exec("DROP TABLE IF EXISTS payments_default;");
    db.exec("DROP TABLE IF EXISTS payments_fallback;");

    console.log("Database purged successfully.");

    initializeDatabase();

    console.log("Database reinitialized successfully.");
  } catch (error) {
    console.error("Failed to purge database:", error);
  }
}