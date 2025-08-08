import Elysia, { t } from "elysia";

import { purge } from "../shared/data/database";
import { enqueuePayment } from "../shared/data/queue";
import { getSummary } from "../shared/services/payment-summary";

new Elysia()
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
  .listen(9999, () => {
    console.log("🦊 Server is running on http://localhost:9999");
  });