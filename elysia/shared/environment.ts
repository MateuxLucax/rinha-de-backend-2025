export const DEFAULT_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || "http://payment-processor-default:8080";
export const FALLBACK_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || "http://payment-processor-fallback:8080";

export const DATABASE_URL = process.env.DATABASE_URL || "http://database:9999";

export const AXIOM_TOKEN = process.env.AXIOM_TOKEN || "dummy";
export const AXIOM_DATASET = process.env.AXIOM_DATASET || "rinha";

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "123";

export const PORT = process.env.PORT || 9999;

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "25", 25);