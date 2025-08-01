import { type Payment, PaymentProcessorType, PaymentProcessorUrl } from "../model/types";
import { record } from "@elysiajs/opentelemetry";
import { storePayment } from "../data/database";
import { dequeuePayment, enqueuePayment, getHealthyProcessor } from "../data/queue";
import { OperationCanceledException } from "typescript";
import { BATCH_SIZE } from "../environment";

let healthyProcessor: PaymentProcessorType = PaymentProcessorType.DEFAULT;

async function postPayment(payload: Payment) {
  return record('store.payment.post', async () => {
    try {
      const processor = healthyProcessor
      const url = PaymentProcessorUrl.getUrl(processor);
      const response = await fetch(`${url}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correlationId: payload.correlationId, amount: payload.amount, requestedAt: new Date(payload.requestedAt).toISOString() })
      });

      if (response.ok) return processor;
      else {
        const body = await response.text();
        if (body?.includes("already exists")) return processor;
      }
    } catch (error) {
      console.error("Error posting payment:", error);
    }
  });
}

export async function listenForPayments() {
  while(true) {
    try {
      const payments = await getBatchedPayments();

      if (payments.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      await Promise.all(payments.map(payment => processPayment(payment)));

    } catch (error) {
      console.error("❗ Error decoding payment data: " + process.env.VALKEY_URL, error);
    }
  }
}

async function getBatchedPayments() {
  return record('store.payment.getBatch', async () => {
    const payments = [];
    while (payments.length < BATCH_SIZE) {
      const payment = await dequeuePayment();
      if (!payment) break;
  
      payments.push(payment);
    }
  
    return payments;
  });
}

async function processPayment({correlationId, amount}: {correlationId: string, amount: number}) {
    await record('store.payment.process', async () => {
      try {
        const requestedAt = new Date().getTime();
        const payment: Payment = { correlationId, amount, requestedAt };
        const processor = await postPayment(payment);
  
        if (processor) {
          storePayment(payment, processor)
        } else {
          enqueuePayment(correlationId, amount);
        }
      } catch (error) {
        console.error("❗ Error processing payment:", correlationId, error);
        enqueuePayment(correlationId, amount);
      }
  });
}

export async function listenForHealthyProcessor() {
  setInterval(async () => {
    const processor = await getHealthyProcessor();
    if (processor) {
      healthyProcessor = processor;
    }
  }, 1_000);
}