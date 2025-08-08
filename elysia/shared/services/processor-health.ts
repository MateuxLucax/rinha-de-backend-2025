import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "../environment";
import { PaymentProcessorType, type PaymentProcessorHealthCheckResponse } from "../model/types";
import { enqueueHealthyProcessor } from "../data/queue";

const HEALTH_CHECK_INTERVAL = 5000;

async function getProcessorHealth(processorUrl: string): Promise<PaymentProcessorHealthCheckResponse> {
  const defaultResponse = { failing: true, minResponseTime: Infinity };
  const url = `${processorUrl}/payments/service-health`;

  try {
    const response = await fetch(url); 
    if (!response.ok) return defaultResponse;

    return await response.json() as PaymentProcessorHealthCheckResponse;
  } finally {
    return defaultResponse;
  }
}

async function checkProcessorHealth() {
  try {
    const [defaultHealth, fallbackHealth] = await Promise.all([
      getProcessorHealth(DEFAULT_PROCESSOR_URL),
      getProcessorHealth(FALLBACK_PROCESSOR_URL)
    ]);

    if (defaultHealth.failing && fallbackHealth.failing) return;

    if (defaultHealth.failing) return PaymentProcessorType.FALLBACK; 
    if ((defaultHealth.minResponseTime * 1.2) > fallbackHealth.minResponseTime) return PaymentProcessorType.FALLBACK;

    return PaymentProcessorType.DEFAULT;
  } finally {}
}

export function initProcessorHealthCheck() {
  setInterval(async () => {
    const healthyProcessor = await checkProcessorHealth();
    if (healthyProcessor) {
      await enqueueHealthyProcessor(healthyProcessor);
    }

  }, HEALTH_CHECK_INTERVAL);
}
