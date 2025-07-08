import { Elysia, t } from "elysia";
import { DEFAULT_PROCESSOR_URL } from "./utils/environment";
import { type PaymentProcessorRequest, type PaymentRequest, type PaymentsSummaryResponse } from "./model/types";
import { db } from "./database/database";
import { currentHealthProcessorUrl } from "./utils/payment-processor";
import createAccelerator from "json-accelerator";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.String(),
})

const encode = createAccelerator(paymentProcessorPayload);

async function enqueuePayment(
  payload: PaymentRequest,
) {
  db.exec(`
    INSERT INTO payment_queue (correlationId, amount)
    VALUES (?, ?)
    ON CONFLICT(correlationId) DO UPDATE SET amount = excluded.amount;
  `, [payload.correlationId, payload.amount]);
}

async function getPaymentQueue() {
  return db.query("SELECT * FROM payment_queue LIMIT 100").all();
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

  if (!res.ok) throw new Error('Failed to process payment');

  return processorUrl === DEFAULT_PROCESSOR_URL ? 'default' : 'fallback';
}

async function storePayment(
  processor: 'default' | 'fallback',
  payload: PaymentProcessorRequest,
) {
  const tableName = processor === 'default' ? 'payments_default' : 'payments_fallback';
  db.exec(`
    INSERT INTO ${tableName} (amount, requestedAt)
    VALUES (?);
  `, [payload.amount, payload.requestedAt]);
}

async function handlePayments() {
  const queue = await getPaymentQueue() as any;
  const successfulPayments = [];

  for (const payment of queue) {
    try {
      const processor = await postPayment({
        correlationId: payment.correlationId,
        amount: payment.amount,
        requestedAt: new Date().toISOString(),
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
  }

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

async function getPaymentSummaryFromProcessor(
  processor: 'default' | 'fallback',
  from: string,
  to: string,
) {
  const tableName = processor === 'default' ? 'payments_default' : 'payments_fallback';

  const query = db.query(`
    SELECT amount
      FROM ${tableName}
     WHERE date(requestedAt) BETWEEN date(${from}) AND date(${to});
  `);

  let totalRequests = 0;
  let totalAmount = 0;

  for (const row of query.iterate()) {
    totalRequests += 1;
    totalAmount += (row as any).amount
  }

  return {
    totalRequests,
    totalAmount,
  }
}

paymentsWorker();

const app = new Elysia()
  .post('/payments', async ({ body, set }) => {
    const { correlationId, amount } = body as PaymentRequest;
    if (!correlationId || typeof amount !== 'number') {
      set.status = 400;
      return;
    }

    try {
      await enqueuePayment({ correlationId, amount });
      set.status = 201;
    } catch (error) {
      console.error('Failed to enqueue payment:', error);
      set.status = 500;
    }
  })
  .get('/payments-summary', ({ query, set }) => {
    const from = query.from;
    const to = query.to;

    if (!from || !to) {
      set.status = 400;
      return;
    }

    return getPaymentsSummary(from, to);
  })
  .listen(9999);