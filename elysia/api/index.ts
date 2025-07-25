import { opentelemetry } from "@elysiajs/opentelemetry";
import swagger from "@elysiajs/swagger";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import Elysia, { t } from "elysia";
import { AXIOM_DATASET, AXIOM_TOKEN, ZMQ_PORT } from "../shared/environment";
import { Payment } from "../shared/model/types";
import { Publisher } from "zeromq"
import { fastEncode } from "../shared/encode";

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
    await publisher.send(
      fastEncode(
        new Payment(
          correlationId,
          amount,
          new Date()
        )
      )
    )
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
    return getPaymentSummary(from, to);
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
  .post("/purge-payments", async () => {
    await purgeDatabase();
    return;
  })

const publisher = new Publisher();
publisher.bind(`tcp://127.0.0.1:${ZMQ_PORT}`)
