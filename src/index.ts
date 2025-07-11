import { Elysia, t } from "elysia";
import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "./utils/environment";
import { type PaymentProcessorRequest, type PaymentsSummaryResponse } from "./model/types";
import { db } from "./database/database";
import { checkProcessorHealth } from "./utils/payment-processor";
import createAccelerator from "json-accelerator";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.String(),
})

const encode = createAccelerator(paymentProcessorPayload);

let currentHealthyProcessor: 'default' | 'fallback' = 'default';

setInterval(async () => {
  console.log('Checking payment processor health...');
  const isDefaultHealthy = await checkProcessorHealth(DEFAULT_PROCESSOR_URL);
  console.log(`Default processor health: ${isDefaultHealthy}`);
  
  if (isDefaultHealthy) {
    currentHealthyProcessor = 'default';
  } else {
    currentHealthyProcessor = 'fallback';
  }
}, 5_000);

export let currentHealthProcessorUrl = currentHealthyProcessor === 'default'
  ? DEFAULT_PROCESSOR_URL
  : FALLBACK_PROCESSOR_URL;

async function enqueuePayment(
  payload: PaymentProcessorRequest,
) {
  try {
    db.exec(`
      INSERT INTO payment_queue (correlationId, amount, requestedAt)
      VALUES (?, ?, ?);
    `, [payload.correlationId, payload.amount, payload.requestedAt]);
  } catch (error) {
    console.error('Failed to enqueue payment:', error);
    throw new Error('Failed to enqueue payment');
  }
}

async function getPaymentQueue() {
  return db.query("SELECT * FROM payment_queue LIMIT 50").all();
}

async function postPayment(
  payload: PaymentProcessorRequest,
): Promise<'default' | 'fallback'> {
  const processorUrl = currentHealthProcessorUrl;
  const res = await fetch(`${processorUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: encode(payload),
  });

  const resBody = await res.text();

  if (!res.ok) {    
    if (!resBody.includes('CorrelationId already exists')) {
      throw new Error(`Failed to post payment to ${processorUrl}: ${resBody}`);
    }
  }

  return processorUrl === DEFAULT_PROCESSOR_URL ? 'default' : 'fallback';
}

async function storePayment(
  processor: 'default' | 'fallback',
  payload: PaymentProcessorRequest,
) {
  const tableName = processor === 'default' ? 'payments_default' : 'payments_fallback';
  try {
    db.exec(`
      INSERT INTO ${tableName} (amount, requestedAt)
      VALUES (?, ?);
    `, [payload.amount, payload.requestedAt]);
  } catch (error) {
    console.error(`Failed to store payment in ${tableName}:`, error);
    throw new Error(`Failed to store payment in ${tableName}`);
  }
}

async function handlePayments() {
  const queue = await getPaymentQueue() as any;
  if (queue.length === 0) {
    console.log('No payments to process');
    return;
  }

  const successfulPayments: string[] = [];

  await Promise.all(queue.map(async (payment: any) => {
    try {
      const processor = await postPayment({
        correlationId: payment.correlationId,
        amount: payment.amount,
        requestedAt: payment.requestedAt,
      });

      if (!processor) throw new Error('Failed to publish payment');

      await storePayment(processor, {
        correlationId: payment.correlationId,
        amount: payment.amount,
        requestedAt: new Date().toISOString(),
      });

      successfulPayments.push(payment.correlationId);
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  })).then(() => {
    console.log('Processed payments:', successfulPayments.length);
  });

  if (successfulPayments.length > 0) {
    db.exec(`
      DELETE FROM payment_queue
      WHERE correlationId IN (${successfulPayments.map(() => '?').join(', ')});
    `, successfulPayments);
  }
}

let isProcessing = false;

async function paymentsWorker() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    await handlePayments();
  } finally {
    isProcessing = false;
  }
  setTimeout(paymentsWorker, 100);
}

async function getPaymentsSummary(from: string, to: string): Promise<PaymentsSummaryResponse> {
  const [defaultSummary, fallbackSummary] = await Promise.all([
    getPaymentSummaryFromProcessor('default', from, to),
    getPaymentSummaryFromProcessor('fallback', from, to),
  ]);

  return {
    default: {
      totalRequests: defaultSummary.totalRequests,
      totalAmount: defaultSummary.totalAmount,
    },
    fallback: {
      totalRequests: fallbackSummary.totalRequests,
      totalAmount: fallbackSummary.totalAmount,
    },
  };
}

const clearDate = (date: string) => {
  // Ensure the date from format YYYY-MM-DDTHH:mm:ss.sssZ is cleared to YYYY-MM-DD HH:mm:ss
  return date
    .replace('T', ' ')
    .replace('Z', '')
    .replace(/\.\d{3}/, ''); // Remove .sss (milliseconds)
}

async function getPaymentSummaryFromProcessor(
  processor: 'default' | 'fallback',
  from: string,
  to: string,
) {
  const tableName = processor === 'default' ? 'payments_default' : 'payments_fallback';

  try {     
    const query = db.query(
      `SELECT amount
         FROM ${tableName}
        WHERE date(requestedAt) BETWEEN date(?) AND date(?);`,
    );
      
    let totalRequests = 0;
    let totalAmount = 0;
  
    for (const row of query.iterate(clearDate(from), clearDate(to))) {
      totalRequests += 1;
      totalAmount += ((row as any).amount).toFixed(2) || 0; // Ensure amount is a number
    }
  
    return {
      totalRequests,
      totalAmount,
    }
  
  } catch (error) {
    console.error(`Failed to get payment summary for ${processor}:`, error);
  }

  throw new Error(`Failed to get payment summary for ${processor}`);
}

paymentsWorker();

const app = new Elysia()
  .post('/payments', async ({ body, set }) => {
    console.log('Received payment request');
    const { correlationId, amount } = body as any;
    if (!correlationId || typeof amount !== 'number') {
      set.status = 400;
      return;
    }

    try {
      await enqueuePayment({ correlationId, amount, requestedAt: new Date().toISOString() });
      set.status = 201;
    } catch (error) {
      console.error('Failed to enqueue payment:', error);
      set.status = 500;
    }
  })
  .get('/payments-summary', async ({ query, set }) => {
    console.log('Received payments summary request');
    const from = query.from;
    const to = query.to;

    if (!from || !to) {
      set.status = 400;
      return;
    }

    const res = await getPaymentsSummary(from, to);
    return res;
  })
  .listen(9999, () => {
    console.log('Server is running on http://localhost:9999');
  });