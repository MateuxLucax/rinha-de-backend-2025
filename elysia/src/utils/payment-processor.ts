import type { PaymentProcessorHealthCheckResponse } from "../model/types";
import { MIN_RESPONSE_TIME_THRESHOLD } from "./environment";

export async function checkProcessorHealth(processorUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${processorUrl}/service-health`);
    if (!res.ok) throw new Error('Health check failed');

    const data = await res.json() as PaymentProcessorHealthCheckResponse;

    if (data.failing) return false;
    if (data.minResponseTime > MIN_RESPONSE_TIME_THRESHOLD) return false;

    return true;
  } catch {
    return false;
  }
}
