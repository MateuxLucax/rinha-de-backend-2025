import { opentelemetry } from "@elysiajs/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import Elysia, { t } from "elysia";
import { AXIOM_DATASET, AXIOM_TOKEN, PORT } from "../shared/environment";
import { PaymentProcessorType, type Payment } from "../shared/model/types";

const defaultPayments: Payment[] = [];
const fallbackPayments: Payment[] = [];

new Elysia()
  .use(
    opentelemetry({
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: 'https://api.axiom.co/v1/traces', 
            headers: {
              'Authorization': `Bearer ${AXIOM_TOKEN}`, 
              'X-Axiom-Dataset': AXIOM_DATASET
            } 
          })
        )
      ]
    })  
  )
  .post("/store/:processor", ({ body, params: { processor } }) => {
    switch (processor) {
      case PaymentProcessorType.DEFAULT:
        defaultPayments.push(body);
        break;
      case PaymentProcessorType.FALLBACK:
        fallbackPayments.push(body);
        break;
      default:
        throw new Error(`Unknown processor type: ${processor}`);
    }
  }, {
    body: t.Object({
      correlationId: t.String({
        description: "Unique identifier for the payment request",
        example: "123e4567-e89b-12d3-a456-426614174000"
      }),
      amount: t.Number({
        description: "Amount to be processed",
        example: 100.50
      }),
      requestedAt: t.Integer({
        description: "Timestamp when the payment was requested, in milliseconds since epoch",
        example: 1704067200000 // Example: 2024-01-01T00:00:00Z
      })
    }),
    params: t.Object({
      processor: t.Enum(PaymentProcessorType, {
        description: "Payment processor type",
        example: PaymentProcessorType.DEFAULT
      })
    })
  })
  .get("summary/:processor", ({ query: { from, to }, params: { processor } }) => {
    let totalRequests = 0;
    let totalAmount = 0;

    for (const payment of (processor === PaymentProcessorType.DEFAULT ? defaultPayments : fallbackPayments)) {
      if (payment.requestedAt < from) return;
      if (payment.requestedAt > to) return;

      totalRequests++;
      totalAmount += payment.amount;
    }

    return {
      totalRequests: totalRequests,
      totalAmount
    }
  }, {
    query: t.Object({
      from: t.Integer({
        format: "integer",
        description: "Start date for the payment summary in milliseconds since epoch",
        example: "1704067200000" // Example: 2024-01-01T00:00:00Z
      }),
      to: t.Integer({
        format: "integer",
        description: "End date for the payment summary in milliseconds since epoch",
        example: "1704067200000" // Example: 2024-01-01T00:00:00Z
      }),
    })
  })
  .delete("/purge", () => {
    while (defaultPayments.length > 0) defaultPayments.pop();
    while (fallbackPayments.length > 0) fallbackPayments.pop();
  })
  .listen(PORT, () => {
    console.log(`🦊 Database is running on http://localhost:${PORT}`);
  });