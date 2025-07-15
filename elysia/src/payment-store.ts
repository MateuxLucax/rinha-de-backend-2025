import createAccelerator from "json-accelerator";
import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL, MIN_RESPONSE_TIME_THRESHOLD } from "./environment";
import { PaymentProcessorRequest, PaymentProcessorType, type PaymentProcessorHealthCheckResponse } from "./types";
import { t } from "elysia";
import { db } from "./database";

let currentProcessorType: PaymentProcessorType = PaymentProcessorType.DEFAULT;

const HEALTH_CHECK_INTERVAL = 5_000;

setInterval(async () => {
  try {
    const results = await Promise.allSettled([
      fetch(`${DEFAULT_PROCESSOR_URL}//payments/service-health`),
      fetch(`${FALLBACK_PROCESSOR_URL}//payments/service-health`)
    ]);

    let defaultHealth: PaymentProcessorHealthCheckResponse | null = null;
    let fallbackHealth: PaymentProcessorHealthCheckResponse | null = null;

    for (let i = 0; i < results.length; i++) {
      const response = results[i];
      const processor = i === 0 ? PaymentProcessorType.DEFAULT : PaymentProcessorType.FALLBACK;

      if (response === undefined) continue;

      if (response.status === "rejected") {
        if (processor === PaymentProcessorType.DEFAULT) {
          defaultHealth = { failing: true, minResponseTime: Infinity };
        } else {
          fallbackHealth = { failing: true, minResponseTime: Infinity };
        }

        continue;
      }

      try {
        const data = await response.value.json() as PaymentProcessorHealthCheckResponse;
        if (processor === PaymentProcessorType.DEFAULT) {
          defaultHealth = data;
        } else {
          fallbackHealth = data;
        }  
      } catch (error) {
        console.error(`Error parsing health check response for ${processor}:`, error);
        if (processor === PaymentProcessorType.DEFAULT) {
          defaultHealth = { failing: true, minResponseTime: Infinity };
        } else {
          fallbackHealth = { failing: true, minResponseTime: Infinity };
        }
      }
    }

    if (!defaultHealth || !fallbackHealth) {
      console.error("Failed to fetch health check data for both processors.");
      return currentProcessorType;
    }

    if (defaultHealth.failing && fallbackHealth.failing) {
      console.error("Both payment processors are failing.");
      return;
    }

    if (defaultHealth.failing) {
      currentProcessorType = PaymentProcessorType.FALLBACK;
    } else if (fallbackHealth.failing) {
      currentProcessorType = PaymentProcessorType.DEFAULT;
    } else if (defaultHealth.minResponseTime < MIN_RESPONSE_TIME_THRESHOLD) {
      currentProcessorType = PaymentProcessorType.DEFAULT;
    } else if (fallbackHealth.minResponseTime < MIN_RESPONSE_TIME_THRESHOLD) {
      currentProcessorType = PaymentProcessorType.FALLBACK;
    } else {
      currentProcessorType = PaymentProcessorType.DEFAULT;
    }
  } catch (error) {
    console.error("Error checking payment processor health:", error);
    if (currentProcessorType === PaymentProcessorType.DEFAULT) {
      currentProcessorType = PaymentProcessorType.FALLBACK;
    } else {
      currentProcessorType = PaymentProcessorType.DEFAULT;
    }
  }

}, HEALTH_CHECK_INTERVAL);


async function getHealthProcessorUrl() {
  return currentProcessorType === PaymentProcessorType.DEFAULT
    ? DEFAULT_PROCESSOR_URL
    : FALLBACK_PROCESSOR_URL;
}

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.String(),
})

const encode = createAccelerator(paymentProcessorPayload);

async function postPayment(payload: PaymentProcessorRequest): Promise<boolean> {
  try {
    const response = await fetch(`${await getHealthProcessorUrl()}//payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: encode(payload)
    });

    if (response.ok) return true;
  } catch (error) {
    console.error("Error posting payment:", error);
  }

  return false;
}

export function enqueuePayment(payload: PaymentProcessorRequest): boolean {
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
}

function dequeuePayment(): PaymentProcessorRequest[] {
  try {
    const query = db.query("SELECT * FROM payment_queue ORDER BY id ASC LIMIT 50");
    const payments: PaymentProcessorRequest[] = [];

    for (const row of query.iterate()) {
      const correlationId = (row as any).correlationId;
      payments.push(new PaymentProcessorRequest(
        correlationId,
        (row as any).amount,
        (row as any).requestedAt
      ));
    }

    return payments;
  } catch (error) {
    console.error("Error dequeuing payment:", error);
  }

  return [];
}

function removeFromQueue(correlationId: string): boolean {
  try {
    db.exec("DELETE FROM payment_queue WHERE correlationId = ?;", [correlationId]);
    return true;
  } catch (error) {
    console.error("Error removing payment from queue:", error);
  }

  return false;
}

function storePayment(payload: PaymentProcessorRequest, type: PaymentProcessorType): boolean {
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
}

async function processPayment() {
  const payments = dequeuePayment();

  if (payments.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  }

  const results = await Promise.all(payments.map(postPayment));


  for (let i = 0; i < results.length; i++) {
    const payment = payments[i];

    if (!payment) continue;

    if (!results[i]) {
      console.error(`Failed to process payment with correlationId: ${payment.correlationId} | currentProcessorType: ${currentProcessorType}`);
      continue;
    }

    storePayment(payment, currentProcessorType);
    removeFromQueue(payment.correlationId);
  }
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