import createAccelerator from "json-accelerator";
import { PaymentProcessorRequest, PaymentProcessorType, PaymentProcessorUrl } from "./types";
import { t } from "elysia";
import { db } from "./database";
import { getHealthyProcessor } from "./processor-health";
import { record } from "@elysiajs/opentelemetry";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.String(),
})

const encode = createAccelerator(paymentProcessorPayload);

async function postPayment(payload: PaymentProcessorRequest): Promise<PaymentProcessorType> {
  return record('store.payment.post', async () => {
    try {
      const processor = getHealthyProcessor();
      const url = PaymentProcessorUrl.getUrl(processor);
      const response = await fetch(`${url}//payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: encode(payload),
        signal: AbortSignal.timeout(500)
      });

      if (response.ok) return processor;
      else {
        const body = await response.text();
        if (body?.includes("already exists")) return processor;
      }
    } catch (error) {
      if (error instanceof DOMException) {
        // Timeout error
      } else if (error instanceof Error) {
        // Other fetch error
      } else {
        console.error("Error posting payment:", error);
      }
    }

    return PaymentProcessorType.NONE;
  });
}

export function enqueuePayment(payload: PaymentProcessorRequest): boolean {
  return record('store.payment.enqueue', () => {
    try {
      db.exec(`
        INSERT INTO payment_queue (correlationId, amount, requestedAt)
        VALUES (?, ?, ?);
      `, [payload.correlationId, payload.amount, payload.requestedAt]);

      return true;
    } catch (error) {
      console.error("Error enqueuing payment:", error);
    }

    return false;
  });
}

function dequeuePayment(): PaymentProcessorRequest[] {
  return record('store.payment.dequeue', () => {
    try {
      const query = db.query("SELECT * FROM payment_queue ORDER BY id ASC LIMIT 10");
      const payments: PaymentProcessorRequest[] = [];

      for (const row of query.iterate()) {
        const correlationId = (row as any).correlationId;
        payments.push(new PaymentProcessorRequest(
          correlationId,
          (row as any).amount,
          (row as any).requestedAt
        ));

        removeFromQueue(correlationId);
      }

      return payments;
    } catch (error) {
      console.error("Error dequeuing payment:", error);
    }

    return [];
  });
}

function removeFromQueue(correlationId: string): boolean {
  return record('store.payment.removeFromQueue', () => {
    try {
      db.exec("DELETE FROM payment_queue WHERE correlationId = ?;", [correlationId]);
      return true;
    } catch (error) {
      console.error("Error removing payment from queue:", error);
    }

    return false;
  });
}

function storePayment(payload: PaymentProcessorRequest, type: PaymentProcessorType): boolean {
  return record('store.payment.store', () => {
    const table = type === PaymentProcessorType.DEFAULT ? "payments_default" : "payments_fallback";

    try {
      db.exec(`
        INSERT INTO ${table} (amount, requestedAt)
        VALUES (?, ?);
      `, [payload.amount, payload.requestedAt]);

      return true;
    } catch (error) {
      console.error("Error storing payment:", error);
    }

    return false;
  });
}

async function processPayment() {
  const payments = dequeuePayment();

  if (payments.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return;
  }

  record('store.payment.process', async () => {
    const results = await Promise.all(payments.map(postPayment));

    for (let i = 0; i < results.length; i++) {
      const payment = payments[i];

      if (!payment) continue;

      const processor = results[i];
      if (!processor || processor === PaymentProcessorType.NONE) {
        // console.error(`Failed to process payment with correlationId: ${payment.correlationId} | processor: ${processor}`);
        enqueuePayment(payment);
        continue;
      }

      storePayment(payment, processor);
    }
  });
}

export async function runPaymentProcessor() {
  while(true) {
    try {
      await processPayment();
    } catch (error) {
      console.error("Error in payment processor loop:", error);
    }
  }
}