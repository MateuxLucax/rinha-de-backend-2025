import type { Payment } from "./model/types";

export function encode(payload: Payment): string {
	return `${payload.correlationId}|${payload.amount}|${payload.requestedAt}`;
}

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