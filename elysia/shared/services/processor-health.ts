import { record } from "@elysiajs/opentelemetry";
import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "../environment";
import { PaymentProcessorType, type PaymentProcessorHealthCheckResponse } from "../model/types";
import { abort } from "../util";
import { enqueueHealthyProcessor } from "../data/queue";

const HEALTH_CHECK_INTERVAL = 5_000;

async function getProcessorHealth(processorUrl: string): Promise<PaymentProcessorHealthCheckResponse> {
  return record(`processor.health.check.${processorUrl}`, async () => {
    const defaultResponse = { failing: true, minResponseTime: Infinity };

    try {
      const response = await fetch(`${processorUrl}/payments/service-health`, abort);
      if (!response.ok) return defaultResponse;

      return await response.json() as PaymentProcessorHealthCheckResponse;
    } catch (error) {
      console.error(`❗ Error fetching health check for ${processorUrl}:`, error);
      return defaultResponse;
    }
  });
}

async function checkProcessorHealth() {
  return record('processor.health.check', async () => {
    try {
      const [defaultHealth, fallbackHealth] = await Promise.all([
        getProcessorHealth(DEFAULT_PROCESSOR_URL),
        getProcessorHealth(FALLBACK_PROCESSOR_URL)
      ]);

      if (defaultHealth.failing && fallbackHealth.failing) {
        console.error("Both payment processors are failing.");
        return;
      }

      if (fallbackHealth.failing) return PaymentProcessorType.DEFAULT;
      if (!defaultHealth.failing && defaultHealth.minResponseTime <= fallbackHealth.minResponseTime) return PaymentProcessorType.DEFAULT;

      return PaymentProcessorType.FALLBACK;
    } catch (error) {
      console.error("Error checking payment processor health:", error);
    }
  });
}

export function initProcessorHealthCheck() {
  setInterval(async () => {
    const healthyProcessor = await checkProcessorHealth();
    if (healthyProcessor) {
      await enqueueHealthyProcessor(healthyProcessor);
    } else {
      console.warn("❗ No healthy payment processor found.");
    }
  }, HEALTH_CHECK_INTERVAL);
}
