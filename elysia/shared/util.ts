import type { Payment } from "./model/types";

export function encode(payload: Payment): string {
	return `${payload.correlationId}|${payload.amount}|${payload.requestedAt}`;
}

export function decode(data: string): Payment | undefined {
	const [correlationId, amount, requestedAt] = data.split("|");

	if (!correlationId || !amount || !requestedAt) return;

	return {
		correlationId,
		amount: parseFloat(amount),
		requestedAt: parseInt(requestedAt, 10)
	}
}