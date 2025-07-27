import { t } from "elysia";
import createAccelerator from "json-accelerator";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.Integer(),
})

export const fastEncode = createAccelerator(paymentProcessorPayload);

export const abort = { signal: AbortSignal.timeout(1_000) };

export function decode<T>(data: string): T {
	try {
		return JSON.parse(data) as T;
	} catch (error) {
		console.error("❗ Error decoding data:", error);
		throw new Error("Failed to decode data");
	}
}