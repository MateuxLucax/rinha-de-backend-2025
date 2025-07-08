export type PaymentRequest = {
  correlationId: string;
  amount: number;
}

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

export type PaymentProcessorRequest = {
  correlationId: string;
  amount: number;
  requestedAt: string;
}

export type PaymentProcessorHealthCheckResponse = {
  failing: boolean;
  minResponseTime: number;
}

export class PaymentSummaryDatabaseRecord {
  constructor(
    public amount: number,
    public requestedAt: string,
  ) {}
}