import { record } from "@elysiajs/opentelemetry";
import { PaymentProcessorType, type PaymentSummaryPart } from "../model/types";
import { abort } from "../util";
import { DATABASE_URL } from "../environment";

async function getPaymentSummaryFromProcessor(
  processor: PaymentProcessorType,
  from: string,
  to: string,
) {
  return record(`store.payment.summary.${processor}`, async () => {
    try {
      const response = await fetch(`${DATABASE_URL}/summary/${processor}?from=${from}&to=${to}`, abort);

      return await response.json() as PaymentSummaryPart;
    } catch (error) {
      console.error(`Error fetching payment summary for ${processor}:`, error);
      return {
        totalRequests: 0,
        totalAmount: 0,
      };
    }
  });
}

export function getPaymentSummary(from: string, to: string) {
  return {
    default: getPaymentSummaryFromProcessor(PaymentProcessorType.DEFAULT, from, to),
    fallback: getPaymentSummaryFromProcessor(PaymentProcessorType.FALLBACK, from, to),
  };
}