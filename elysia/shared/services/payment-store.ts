import { type Payment, PaymentProcessorType, PaymentProcessorUrl } from "../model/types";
import { record } from "@elysiajs/opentelemetry";
import { abort, decode, fastEncode } from "../util";
import { sendToQueue, pull, pullHealthA } from "../data/queue";
import { storePayment } from "../data/database";
import type { Pull } from "zeromq";

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
      if (error instanceof DOMException) {
        // Timeout error
      } else if (error instanceof Error) {
        // Other fetch error
      } else {
        console.error("Error posting payment:", error);
      }
    }
  });
}

export async function listenForPayments() {
  for await(const [msg] of pull) {
    if (!msg) continue;

    try {
      const payment: Payment = decode<Payment>(msg?.toString());

      record('store.payment.process', async () => {
        const processor = await postPayment(payment);

        if (!processor) {
          sendToQueue(payment);
        } else {
          storePayment(payment, processor)
        }
      });

    } catch (error) {
      console.error("❗ Error decoding payment data:", error);
      continue;
    }
  }
}

export async function listenForHealth(target: Pull) {
  for await(const [msg] of target) {
    if (!msg) continue;

    try {
      const processor = msg.toString() as PaymentProcessorType;

      healthyProcessor = processor;
      console.log(`Processor health updated: ${healthyProcessor}`);
    } catch (error) {
      console.error("❗ Error updating processor health:", error);
    }
  }
}
