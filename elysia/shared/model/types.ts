import { DEFAULT_PROCESSOR_URL, FALLBACK_PROCESSOR_URL } from "../environment";

export type PaymentSummaryPart = {
  totalRequests: number;
  totalAmount: number;
}

export type PaymentSummary = {
  default: PaymentSummaryPart;
  fallback: PaymentSummaryPart;
}

export type PaymentProcessorHealthCheckResponse = {
  failing: boolean;
  minResponseTime: number;
}

export type Payment = {
  correlationId: string;
  amount: number;
  requestedAt: number; // Timestamp in milliseconds since epoch
}

export enum PaymentProcessorType {
  DEFAULT = "default",
  FALLBACK = "fallback"
}

export const PaymentProcessorUrl = {
  getUrl(type: PaymentProcessorType): string {
    switch (type) {
      case PaymentProcessorType.DEFAULT:
        return DEFAULT_PROCESSOR_URL;
      case PaymentProcessorType.FALLBACK:
        return FALLBACK_PROCESSOR_URL;
    }
  }
}