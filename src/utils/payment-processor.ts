import type { PaymentProcessorHealthCheckResponse } from "../model/types";
import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL, MIN_RESPONSE_TIME_THRESHOLD } from "./environment";

let currentHealthyProcessor: 'default' | 'fallback' = 'default';

async function checkProcessorHealth(processorUrl: string): Promise<boolean> {
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

setInterval(async () => {
  const isDefaultHealthy = await checkProcessorHealth(DEFAULT_PROCESSOR_URL);
  
  if (isDefaultHealthy) {
    currentHealthyProcessor = 'default';
  } else {
    currentHealthyProcessor = 'fallback';
  }
}, 5_000);

export let currentHealthProcessorUrl = currentHealthyProcessor === 'default'
  ? DEFAULT_PROCESSOR_URL
  : FALLBACK_PROCESSOR_URL;