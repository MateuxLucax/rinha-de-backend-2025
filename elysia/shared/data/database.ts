import { record } from "@elysiajs/opentelemetry";
import { ADMIN_TOKEN, DATABASE_URL } from "../environment";
import { PaymentProcessorType, PaymentProcessorUrl, type Payment, type PaymentSummary, type PaymentSummaryPart } from "../model/types";
import { abort, fastEncode } from "../util";

export async function purge() {
  try {
    await Promise.all([
      purgeProcessors(PaymentProcessorType.DEFAULT),
      purgeProcessors(PaymentProcessorType.FALLBACK),
      fetch(`${DATABASE_URL}/admin/purge-payments`, {
        method: 'DELETE',
        headers: {
          'X-Rinha-Token': ADMIN_TOKEN
        },
        ...abort
      })
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
      const response = await fetch(`${DATABASE_URL}/store/${processor}`, {
        method: 'POST',
        body: fastEncode(payload),
        ...abort
      });

      return response.ok;
    } catch (error) {
      console.error("❗ Error posting payment:", error);
    }

    return false;
  });
}

export async function getSummary(to: string, from: string): Promise<PaymentSummary> {
  try {
    const [defaultSummary, fallbackSummary] = await Promise.all([
      fetch(`${DATABASE_URL}/summary/default?from=${from}&to=${to}`, { signal: AbortSignal.timeout(1_000) }),
      fetch(`${DATABASE_URL}/summary/fallback?from=${from}&to=${to}`, { signal: AbortSignal.timeout(1_000) }),
    ]);

    if (!defaultSummary.ok || !fallbackSummary.ok) {
      throw new Error("Failed to fetch payment summaries");
    }

    const defaultData = await defaultSummary.json() as PaymentSummaryPart;
    const fallbackData = await fallbackSummary.json() as PaymentSummaryPart;

    return {
      default: {
        totalRequests: defaultData.totalRequests,
        totalAmount: defaultData.totalAmount
      },
      fallback: {
        totalRequests: fallbackData.totalRequests,
        totalAmount: fallbackData.totalAmount
      }
    }

  } catch (error) {
    console.error("❗ Error fetching payment summary:", error);
    throw new Error("Failed to fetch payment summary");
  }
}