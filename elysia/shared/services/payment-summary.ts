import { PaymentProcessorType, type PaymentSummary, type PaymentSummaryPart } from "../model/types";
import { decode } from "../util";
import { redis } from "bun";

export async function getSummary(from: string, to: string): Promise<PaymentSummary> {
  try {
    const toTime = new Date(to).getTime();
    const fromTime = new Date(from).getTime();

    if (isNaN(toTime) || isNaN(fromTime)) {
      return {
        default: { totalRequests: 0, totalAmount: "0.00" },
        fallback: { totalRequests: 0, totalAmount: "0.00" }
      };
    }

    const [defaultSummary, fallbackSummary] = await Promise.all([
      redis.smembers(`payments:${PaymentProcessorType.DEFAULT}`),
      redis.smembers(`payments:${PaymentProcessorType.FALLBACK}`)
    ]);

    return {
      default: getSummaryPart(defaultSummary, toTime, fromTime),
      fallback: getSummaryPart(fallbackSummary, toTime, fromTime)
    }
  } finally {}
}

function getSummaryPart(data: string[], to: number, from: number): PaymentSummaryPart {
  let totalRequests = 0;
  let totalAmount = 0;

  for (const item of data) {
    const payment = decode(item);

    if (!payment) continue;

    if (payment.requestedAt < from) continue;
    if (payment.requestedAt > to) continue;

    totalRequests++;
    totalAmount += payment.amount;
  }

  return {
    totalRequests,
    totalAmount: totalAmount.toFixed(2) // Ensure amount is a string with two decimal places
  };
}
