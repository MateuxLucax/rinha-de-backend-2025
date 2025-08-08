import type { PaymentProcessorType } from "../model/types";
import { redis } from "bun";

export async function enqueuePayment(correlationId: string, amount: number): Promise<void> {
  await redis.lpush("payments", `${correlationId}|${amount}`);
}

export async function dequeuePayment() {
  const data = await redis.lpop("payments");

  if (!data) return null;

  const [correlationId, amount] = data.split("|");
  return {
    correlationId: correlationId || "",
    amount: parseFloat(amount || "0"),
  }
}

export async function enqueueHealthyProcessor(processor: PaymentProcessorType) {
  await redis.set("healthy-processor", processor);
}

export async function getHealthyProcessor(): Promise<PaymentProcessorType | null> {
  const processor = await redis.get("healthy-processor");

  return processor as PaymentProcessorType | null;
}
