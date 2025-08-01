import Elysia, { t } from "elysia";
import { opentelemetry } from "@elysiajs/opentelemetry";

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import swagger from "@elysiajs/swagger";
import { AXIOM_DATASET, AXIOM_TOKEN, PORT } from "../shared/environment";
import { purge } from "../shared/data/database";
import { enqueuePayment } from "../shared/data/queue";
import { getSummary } from "../shared/services/payment-summary";

new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: "Rinha de Backend 2025 - Elysia",
        description: "API for the Rinha de Backend 2025 competition using Elysia",
        contact: {
          name: "Mateus Brandt",
          url: "https://github.com/mateuxlucax"
        },
        version: "1.0.0"
      },
    }
  }))
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
  .get("/", () => {
    return {
      info: "Rinha de Backend 2025 - Elysia",
      status: "Running",
      date: new Date().toISOString(),
      author: "Mateus Brandt <https://github.com/mateuxlucax>"
    }
  }, {
    response: {
      200: t.Object({
        info: t.String({
          description: "Information about the API",
          example: "Rinha de Backend 2025 - Elysia"
        }),
        status: t.String({
          description: "Current status of the API",
          example: "Running"
        }),
        date: t.String({
          format: "date-time",
          description: "Current date and time",
          example: "2025-01-01T12:00:00Z"
        }),
        author: t.String({
          description: "Author of the API",
          example: "Mateus Brandt <https://github.com/mateuxlucax>"
      })
    })}
  })
  .post("/payments", async ({ body: { correlationId, amount } }) => {
    enqueuePayment(
      correlationId,
      amount
    );
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
  .get("/payments-summary", ({ query: { from, to } }) => {
    return getSummary(from, to);
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
  .post("/purge-payments", purge)
  .listen(PORT, () => {
    console.log("🦊 Server is running on http://localhost:9999");
  });