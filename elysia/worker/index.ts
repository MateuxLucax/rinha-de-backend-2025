import { listenForHealthyProcessor, listenForPayments } from "../shared/services/payment-store";
import { initProcessorHealthCheck } from "../shared/services/processor-health";

console.log("⚙️ Starting worker...");

initProcessorHealthCheck();
listenForPayments();
listenForHealthyProcessor();

console.log("✅ Worker initialized and listening for payments and healthy processor updates.");