import { db, initializeDatabase } from "./database";
import { ADMIN_TOKEN, DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "./environment";
import { PaymentProcessorType } from "./types";

export async function purgeDatabase() {
  try {
    db.exec("DROP TABLE IF EXISTS payment_queue;");
    db.exec("DROP TABLE IF EXISTS payments_default;");
    db.exec("DROP TABLE IF EXISTS payments_fallback;");

    console.log("Database purged successfully.");

    initializeDatabase();
    await purgeProcessors();

    console.log("Database reinitialized successfully.");
  } catch (error) {
    console.error("Failed to purge database:", error);
  }
}

async function purgeProcessors() {
  await Promise.all([
    purgeProcessor(PaymentProcessorType.DEFAULT),
    purgeProcessor(PaymentProcessorType.FALLBACK)
  ]);
  console.log("All processors purged successfully.");
}

async function purgeProcessor(processor: PaymentProcessorType) {
  try {
    const url = processor === PaymentProcessorType.DEFAULT
      ? DEFAULT_PROCESSOR_URL
      : FALLBACK_PROCESSOR_URL;
    const response = await fetch(url + "/admin/purge-payments", {
      method: "POST",
      headers: { "X-Rinha-Token": ADMIN_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`Failed to purge ${processor} processor`);
    }
  } catch (error) {
    console.error(`Error purging ${processor} processor:`, error);
  }
}