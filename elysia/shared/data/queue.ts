import { record } from "@elysiajs/opentelemetry";
import type { Payment, PaymentProcessorType } from "../model/types";
import { decode, encode } from "../util";
import { redis } from "bun";

export async function enqueuePayment(payload: Payment) {
  record('queue.payment.enqueue', async () => {
    await redis.lpush("payments", encode(payload));
  });
}

export async function dequeuePayment(): Promise<Payment | null> {
  return record('queue.payment.dequeue', async () => {
    const data = await redis.lpop("payments");

    return data ? decode(data) : null;
  });
}

export async function enqueueHealthyProcessor(processor: PaymentProcessorType) {
  record('queue.processor.enqueue', async () => {
    await redis.set("healthy-processor", processor);
  });
}

export async function getHealthyProcessor(): Promise<PaymentProcessorType | null> {
  return record('queue.processor.get', async () => {
    const processor = await redis.get("healthy-processor");

    return processor as PaymentProcessorType | null;
  });
}
