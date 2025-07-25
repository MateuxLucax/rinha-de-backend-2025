import { opentelemetry } from "@elysiajs/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import Elysia, { t } from "elysia";
import { AXIOM_DATASET, AXIOM_TOKEN } from "../shared/environment";
import { PaymentProcessorType, Payment } from "../shared/model/types";

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
  .post("/publish/:processor", ({ body, params: { processor } }) => {
    switch (processor) {
      case PaymentProcessorType.DEFAULT:
        defaultPayments.push(new Payment(body.correlationId, body.amount, new Date()));
        break;
      case PaymentProcessorType.FALLBACK:
        fallbackPayments.push(new Payment(body.correlationId, body.amount, new Date()));
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
    }),
  })
  .get("summary/:processor", ({ query: { from, to }, params: { processor } }) => {
    const toDate = new Date(to);
    const fromDate = new Date(from);

    const filteredPayments = (processor === PaymentProcessorType.DEFAULT ? defaultPayments : fallbackPayments)
      .filter(payment => {
        return payment.requestedAt >= fromDate && payment.requestedAt <= toDate;
      });

    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalRequests: filteredPayments.length,
      totalAmount
    }
  }, {
    query: t.Object({
      from: t.String({ 
        format: "date-time",
        description: "Start date for the payment summary",
        example: "2025-01-01T00:00:00Z"
      }),
      to: t.String({
        format: "date-time",
        description: "End date for the payment summary",
        example: "2025-12-31T23:59:59Z"
      }),
    })
  })
  .delete("/purge", () => {
    while (defaultPayments.length > 0) defaultPayments.pop();
    while (fallbackPayments.length > 0) fallbackPayments.pop();
  })
  .listen(3000, () => {
    console.log("Server is running on http://localhost:9999");
  });
