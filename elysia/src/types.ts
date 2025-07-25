import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "./environment";

export type PaymentsSummaryResponse = {
  default: {
    totalRequests: number;
    totalAmount: number;
  },
  fallback: {
    totalRequests: number;
    totalAmount: number;
  }
}

export type PaymentProcessorHealthCheckResponse = {
  failing: boolean;
  minResponseTime: number;
}

export class PaymentProcessorRequest {
  constructor(
    public correlationId: string,
    public amount: number,
    public requestedAt: string
  ) {}
}

export enum PaymentProcessorType {
  DEFAULT = "default",
  FALLBACK = "fallback",
  NONE = "none"
}

export const PaymentProcessorUrl = {
  getUrl(type: PaymentProcessorType): string {
    switch (type) {
      case PaymentProcessorType.DEFAULT:
        return DEFAULT_PROCESSOR_URL;
      case PaymentProcessorType.FALLBACK:
        return FALLBACK_PROCESSOR_URL;
      default:
        throw new Error(`Unknown payment processor type: ${type}`);
    }
  }
}