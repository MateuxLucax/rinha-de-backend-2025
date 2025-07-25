import { t } from "elysia";
import createAccelerator from "json-accelerator";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.Date(),
})

export const fastEncode = createAccelerator(paymentProcessorPayload);
