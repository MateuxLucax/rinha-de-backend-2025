export const DEFAULT_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || "http://payment-processor-default:8080";
export const FALLBACK_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || "http://payment-processor-fallback:8080";

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "123";

export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "25", 25);