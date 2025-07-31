import { type Payment, PaymentProcessorType, PaymentProcessorUrl } from "../model/types";
import { record } from "@elysiajs/opentelemetry";
import { storePayment } from "../data/database";
import { dequeuePayment, enqueuePayment, getHealthyProcessor } from "../data/queue";

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
        body: JSON.stringify({ correlationId: payload.correlationId, amount: payload.amount })
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

const MAX_BATCH_SIZE = 25;

async function getBatchedPayments(): Promise<Payment[]> {
  return record('store.payment.getBatch', async () => {
    const payments: Payment[] = [];
    while (payments.length < MAX_BATCH_SIZE) {
      const payment = await dequeuePayment();
      if (!payment) break;
  
      payments.push(payment);
    }
  
    return payments;
  });
}

async function processPayment(payment: Payment) {
    await record('store.payment.process', async () => {
      try {
        const processor = await postPayment(payment);
  
        if (processor) {
          storePayment(payment, processor)
        } else {
          enqueuePayment(payment);
        }
      } catch (error) {
        console.error("❗ Error processing payment:", payment.correlationId, error);
        enqueuePayment(payment);
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