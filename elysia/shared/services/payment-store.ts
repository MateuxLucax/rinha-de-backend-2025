import { type Payment, PaymentProcessorType, PaymentProcessorUrl } from "../model/types";
import { storePayment } from "../data/database";
import { dequeuePayment, enqueuePayment, getHealthyProcessor } from "../data/queue";
import { BATCH_SIZE } from "../environment";

let healthyProcessor: PaymentProcessorType = PaymentProcessorType.DEFAULT;

async function postPayment(payload: Payment) {
  try {
    const processor = healthyProcessor
    const url = PaymentProcessorUrl.getUrl(processor);
    const body = JSON.stringify({ correlationId: payload.correlationId, amount: payload.amount, requestedAt: new Date(payload.requestedAt).toISOString() })
    const response = await fetch(`${url}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (response.ok) return processor;
    else {
      const body = await response.text();
      if (body?.includes("already exists")) return processor;
    }
  } finally {}
}

export async function listenForPayments() {
  while(true) {
    try {
      const payments = await getBatchedPayments();

      if (payments.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      }

      await Promise.all(payments.map(payment => processPayment(payment)));

    } finally {}
  }
}

async function getBatchedPayments() {
  const payments = [];
  while (payments.length < BATCH_SIZE) {
    const payment = await dequeuePayment();
    if (!payment) break;

    payments.push(payment);
  }

  return payments;
}

async function processPayment({correlationId, amount}: {correlationId: string, amount: number}) {
  let didStore = false;
  try {
    const requestedAt = new Date().getTime();
    const payment: Payment = { correlationId, amount, requestedAt };
    const processor = await postPayment(payment);

    if (processor) didStore = await storePayment(payment, processor)
  } finally {
    if (didStore) return;

    enqueuePayment(correlationId, amount);
  }
}

export async function listenForHealthyProcessor() {
  setInterval(async () => {
    const processor = await getHealthyProcessor();
    if (processor) {
      healthyProcessor = processor;
    }
  }, 1_000);
}