import { db } from "./database";
import { PaymentProcessorType } from "./types";

const clearDate = (date: string) => {
  return date
    .replace('T', ' ')
    .replace('Z', '')
    .replace(/\.\d{3}/, ''); // Remove .sss (milliseconds)
}

function getPaymentSummaryFromProcessor(
  processor: PaymentProcessorType,
  from: string,
  to: string,
) {
  const table = processor === PaymentProcessorType.DEFAULT ? 'payments_default' : 'payments_fallback';

  try {     
    const query = db.query(
      `SELECT amount
         FROM ${table}
        WHERE date(requestedAt) >= date(?) 
          AND date(requestedAt) <= date(?)`,
    );
      
    let totalRequests = 0;
    let totalAmount = 0;
  
    for (const row of query.iterate(clearDate(from), clearDate(to))) {
      totalRequests += 1;
      totalAmount += (((row as any).amount) as number)
    }
  
    return {
      totalRequests,
      totalAmount: totalAmount.toFixed(2),
    }
  } catch (error) {
    console.error(`Failed to get payment summary for ${processor}:`, error);
  }

  throw new Error(`Failed to get payment summary for ${processor}`);
}

export function getPaymentSummary(from: string, to: string) {
  return {
    default: getPaymentSummaryFromProcessor(PaymentProcessorType.DEFAULT, from, to),
    fallback: getPaymentSummaryFromProcessor(PaymentProcessorType.FALLBACK, from, to),
  };
}