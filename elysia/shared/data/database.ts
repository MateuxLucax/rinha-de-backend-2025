import { ADMIN_TOKEN } from "../environment";
import { PaymentProcessorType, PaymentProcessorUrl, type Payment } from "../model/types";
import { encode } from "../util";
import { redis } from "bun";

export async function purge() {
  try {
    await Promise.all([
      purgeProcessors(PaymentProcessorType.DEFAULT),
      purgeProcessors(PaymentProcessorType.FALLBACK),
      redis.del("healthy-processor"),
      redis.del("payments"),
      redis.del("payments:" + PaymentProcessorType.DEFAULT),
      redis.del("payments:" + PaymentProcessorType.FALLBACK)
    ]);

    console.log("🔫 Database purged successfully");
  } finally {}
}

async function purgeProcessors(processor: PaymentProcessorType) {
  fetch(`${PaymentProcessorUrl.getUrl(processor)}/admin/purge-payments`, {
    method: 'POST',
    headers: {
      'X-Rinha-Token': ADMIN_TOKEN
    }
  })
}

export async function storePayment(payload: Payment, processor: PaymentProcessorType): Promise<boolean> {
    try {
      return await redis.sadd(`payments:${processor}`, encode(payload)) > 0;
    } finally {}
} 

export async function isHealthCheckLeader() {
  try {
    const randomString = Math.random().toString(36).substring(2, 15);
    const pid = process.pid + randomString;

    const leader = await redis.get("health-check-leader");
    console.log("🩺 Health Check Leader:", leader, "Current PID:", pid);

  if (!leader) {
      await redis.set("health-check-leader", pid);
      return true;
    }

    if (leader === pid) return true;
  } finally {}

  return false;
}