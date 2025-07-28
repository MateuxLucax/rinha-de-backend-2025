import { record } from "@elysiajs/opentelemetry";
import { PaymentProcessorType, type PaymentSummary, type PaymentSummaryPart } from "../model/types";
import { decode } from "../util";
import { redis } from "bun";

export async function getSummary(to: string, from: string): Promise<PaymentSummary> {
  try {
    const toTime = new Date(to).getTime();
    const fromTime = new Date(from).getTime();

    if (isNaN(toTime) || isNaN(fromTime)) {
      throw new Error("Invalid date format");
    }

    const [defaultSummary, fallbackSummary] = await record('get.summary.smembers', async () => {
      return await Promise.all([
        redis.smembers(`payments:${PaymentProcessorType.DEFAULT}`),
        redis.smembers(`payments:${PaymentProcessorType.FALLBACK}`)
      ]);
    });

    return {
      default: getSummaryPart(defaultSummary, toTime, fromTime),
      fallback: getSummaryPart(fallbackSummary, toTime, fromTime)
    }
  } catch (error) {
    console.error("❗ Error fetching payment summary:", error);
    throw new Error("Failed to fetch payment summary");
  }
}

function getSummaryPart(data: string[], to: number, from: number): PaymentSummaryPart {
  return record('get.summary.part', () => {
    let totalRequests = 0;
    let totalAmount = 0;

    for (const item of data) {
      const payment = decode(item);

      if (payment.requestedAt < from) continue;
      if (payment.requestedAt > to) continue;

      totalRequests++;
      totalAmount += payment.amount;
    }

    return {
      totalRequests,
      totalAmount
    };
  });
}
