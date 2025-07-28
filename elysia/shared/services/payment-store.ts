import { type Payment, PaymentProcessorType, PaymentProcessorUrl } from "../model/types";
import { record } from "@elysiajs/opentelemetry";
import { abort, decode, encode, fastEncode } from "../util";
import { storePayment } from "../data/database";
import { DATABASE_URL } from "../environment";
import { dequeuePayment, enqueuePayment, getHealthyProcessor } from "../data/queue";
import { redis } from "bun";

let healthyProcessor: PaymentProcessorType = PaymentProcessorType.DEFAULT;

async function postPayment(payload: Payment) {
  return record('store.payment.post', async () => {
    try {
      const processor = healthyProcessor
      const url = PaymentProcessorUrl.getUrl(processor);
      const response = await fetch(`${url}//payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: fastEncode(payload),
        ...abort
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
  setInterval(async () => {
    try {
      const payment = await dequeuePayment();

      if (!payment) return;

      record('store.payment.process', async () => {
          const processor = await postPayment(payment);

          if (!processor) {
            enqueuePayment(payment);
          } else {
            storePayment(payment, processor)
          }
      });
    } catch (error) {
      console.error("❗ Error decoding payment data: " + process.env.VALKEY_URL, error);
    }
  }, 1);
}

export async function listenForHealthyProcessor() {
  setInterval(async () => {
    const processor = await getHealthyProcessor();
    if (processor) {
      healthyProcessor = processor;
    }
  }, 1_000);
}