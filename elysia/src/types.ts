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
  FALLBACK = "fallback"
}