export const DEFAULT_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || "http://payment-processor-default:8080";
export const FALLBACK_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || "http://payment-processor-fallback:8080";

export const MIN_RESPONSE_TIME_THRESHOLD = parseInt(process.env.MIN_RESPONSE_TIME_THRESHOLD || '50');

export const AXIOM_TOKEN = process.env.AXIOM_TOKEN || "dummy";
export const AXIOM_DATASET = process.env.AXIOM_DATASET || "rinha";

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "123";

export const ZMQ_PORT = parseInt(process.env.ZMQ_PORT || '5555');