export const DEFAULT_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_DEFAULT || "http://payment-processor-default:8080";
export const FALLBACK_PROCESSOR_URL = process.env.PAYMENT_PROCESSOR_URL_FALLBACK || "http://payment-processor-fallback:8080";

export const DATABASE_URL = process.env.DATABASE_URL || "http://database:9999";

export const AXIOM_TOKEN = process.env.AXIOM_TOKEN || "dummy";
export const AXIOM_DATASET = process.env.AXIOM_DATASET || "rinha";

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "123";

export const PUBLISH_PAYMENTS_PORT = process.env.PUBLISH_PAYMENTS_PORT || '5555';
export const PUBLISH_HEALTH_PORT = process.env.PUBLISH_HEALTH_PORT || '4444';

export const PAYMENTS_ZMQ = process.env.PULL_ZMQ_PORT || '127.0.0.1:5555';
export const HEALTH_ZMQ_A = process.env.PULL_ZMQ_PORT || '127.0.0.1:4444';
export const HEALTH_ZMQ_B = process.env.PULL_ZMQ_PORT || '127.0.0.1:3333';

export const PORT = process.env.PORT || 9999;
