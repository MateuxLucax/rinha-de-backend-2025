import { record } from "@elysiajs/opentelemetry";
import { ADMIN_TOKEN, DATABASE_URL } from "../environment";
import { PaymentProcessorType, PaymentProcessorUrl, type Payment, type PaymentSummary, type PaymentSummaryPart } from "../model/types";
import { abort, decode, encode } from "../util";
import { redis } from "bun";

export async function purge() {
  try {
    await Promise.all([
      purgeProcessors(PaymentProcessorType.DEFAULT),
      purgeProcessors(PaymentProcessorType.FALLBACK),
      redis.del("healthy-processor"),
      redis.del("payments"),
      redis.del("payments:" + PaymentProcessorType.DEFAULT),
      redis.del("payments:" + PaymentProcessorType.FALLBACK)
    ]);

    console.log("🔫 Database purged successfully");
  } catch (error) {
    console.error("❗ Error purging database:", error);
  }
}

async function purgeProcessors(processor: PaymentProcessorType) {
  fetch(`${PaymentProcessorUrl.getUrl(processor)}/admin/purge-payments`, {
    method: 'POST',
    headers: {
      'X-Rinha-Token': ADMIN_TOKEN
    }
  })
}

export async function storePayment(payload: Payment, processor: PaymentProcessorType): Promise<boolean> {
  return record('store.payment', async () => {
    try {
      return await redis.sadd(`payments:${processor}`, encode(payload)) > 0;
    } catch (error) {
      console.error("❗ Error storing payment:", error);
    }

    return false;
  });
} 