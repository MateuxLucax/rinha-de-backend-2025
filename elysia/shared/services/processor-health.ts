import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL, MIN_RESPONSE_TIME_THRESHOLD } from "../environment";
import { PaymentProcessorType, type PaymentProcessorHealthCheckResponse } from "../model/types";

let currentProcessorType: PaymentProcessorType = PaymentProcessorType.DEFAULT;

const HEALTH_CHECK_INTERVAL = 5_000;

export function initProcessorHealthCheck() {
  setInterval(async () => {
    try {
      const results = await Promise.allSettled([
        fetch(`${DEFAULT_PROCESSOR_URL}//payments/service-health`, { signal: AbortSignal.timeout(500) }),
        fetch(`${FALLBACK_PROCESSOR_URL}//payments/service-health`, { signal: AbortSignal.timeout(500) })
      ]);
  
      let defaultHealth: PaymentProcessorHealthCheckResponse | null = null;
      let fallbackHealth: PaymentProcessorHealthCheckResponse | null = null;
  
      for (let i = 0; i < results.length; i++) {
        const response = results[i];
        const processor = i === 0 ? PaymentProcessorType.DEFAULT : PaymentProcessorType.FALLBACK;
  
        if (response === undefined) continue;
  
        if (response.status === "rejected") {
          if (processor === PaymentProcessorType.DEFAULT) {
            defaultHealth = { failing: true, minResponseTime: Infinity };
          } else {
            fallbackHealth = { failing: true, minResponseTime: Infinity };
          }
  
          continue;
        }
  
        try {
          const data = await response.value.json() as PaymentProcessorHealthCheckResponse;
          if (processor === PaymentProcessorType.DEFAULT) {
            defaultHealth = data;
          } else {
            fallbackHealth = data;
          }  
        } catch (error) {
          console.error(`Error parsing health check response for ${processor}:`, error);
          if (processor === PaymentProcessorType.DEFAULT) {
            defaultHealth = { failing: true, minResponseTime: Infinity };
          } else {
            fallbackHealth = { failing: true, minResponseTime: Infinity };
          }
        }
      }

      if (!defaultHealth || !fallbackHealth) {
        console.error("Failed to get health check responses for both processors.");
        currentProcessorType = PaymentProcessorType.NONE;
        return;
      }

      if (defaultHealth.failing && fallbackHealth.failing) {
        console.error("Both payment processors are failing.");
        currentProcessorType = PaymentProcessorType.NONE;
        return;
      }
  
      if (defaultHealth.failing) {
        currentProcessorType = PaymentProcessorType.FALLBACK;
      } else if (fallbackHealth.failing) {
        currentProcessorType = PaymentProcessorType.DEFAULT;
      } else if (defaultHealth.minResponseTime < MIN_RESPONSE_TIME_THRESHOLD) {
        currentProcessorType = PaymentProcessorType.DEFAULT;
      } else if (fallbackHealth.minResponseTime < MIN_RESPONSE_TIME_THRESHOLD) {
        currentProcessorType = PaymentProcessorType.FALLBACK;
      } else {
        currentProcessorType = PaymentProcessorType.DEFAULT;
      }
    } catch (error) {
      console.error("Error checking payment processor health:", error);
      if (currentProcessorType === PaymentProcessorType.DEFAULT) {
        currentProcessorType = PaymentProcessorType.FALLBACK;
      } else {
        currentProcessorType = PaymentProcessorType.DEFAULT;
      }
    }
  
  }, HEALTH_CHECK_INTERVAL);
}

export function getHealthyProcessor() {
  return currentProcessorType;
}
