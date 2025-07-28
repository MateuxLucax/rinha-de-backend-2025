import { t } from "elysia";
import createAccelerator from "json-accelerator";
import type { Payment } from "./model/types";

const paymentProcessorPayload = t.Object({
	correlationId: t.String(),
	amount: t.Number(),
  requestedAt: t.Integer(),
})

export const fastEncode = createAccelerator(paymentProcessorPayload);

export function encode(payload: Payment): string {
	return `${payload.correlationId}|${payload.amount}|${payload.requestedAt}`;
}

export const abort = { signal: AbortSignal.timeout(1_000) };

export function decode(data: string): Payment {
	try {
		const [correlationId, amount, requestedAt] = data.split("|");

		if (!correlationId || !amount || !requestedAt) {
			throw new Error("Invalid data format");
		}

		return {
			correlationId,
			amount: parseFloat(amount),
			requestedAt: parseInt(requestedAt, 10)
		}
	} catch (error) {
		console.error("❗ Error decoding data:", error);
		throw new Error("Failed to decode data");
	}
}