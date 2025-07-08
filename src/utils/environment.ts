export const DEFAULT_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || "http://payment-processor-default:8080";
export const FALLBACK_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || "http://payment-processor-fallback:8080";

export const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || "payments.sqlite";

export const MIN_RESPONSE_TIME_THRESHOLD = parseInt(process.env.MIN_RESPONSE_TIME_THRESHOLD || '200');