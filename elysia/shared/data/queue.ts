import { record } from "@elysiajs/opentelemetry";
import type { PaymentProcessorType } from "../model/types";
import { redis } from "bun";

export async function enqueuePayment(correlationId: string, amount: number): Promise<void> {
  record('queue.payment.enqueue', async () => {
    await redis.lpush("payments", `${correlationId}|${amount}`);
  });
}

export async function dequeuePayment() {
  return record('queue.payment.dequeue', async () => {
    const data = await redis.lpop("payments");

    if (!data) return null;

    const [correlationId, amount] = data.split("|");
    return {
      correlationId: correlationId || "",
      amount: parseFloat(amount || "0"),
    }
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
