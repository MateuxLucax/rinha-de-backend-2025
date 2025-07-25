import { redis } from "bun";
import type { PaymentSummary } from "../model/types";

export function initializeDatabase() {

}

export function getSummary(to: string, from: string): Promise<PaymentSummary> {
  const response = {
    default: {
      totalRequests: 0,
      totalAmount: 0
    },
    fallback: {
      totalRequests: 0,
      totalAmount: 0
    }
  }

  const processors = ["default", "fallback"];

  const promises = processors.map(async (processor) => {
    const key = `payments:${processor}  `;
    const data = await redis.get(key);

    if (data) {
      const summary = JSON.parse(data);
      response[processor].totalRequests = summary.totalRequests;
      response[processor].totalAmount = summary.totalAmount;
    }
  }
}