import { isHealthCheckLeader } from "../shared/data/database";
import { listenForHealthyProcessor, listenForPayments } from "../shared/services/payment-store";
import { initProcessorHealthCheck } from "../shared/services/processor-health";

console.log("⚙️ Starting worker...");

if (await isHealthCheckLeader()) {
  console.log("✅ Processor health check initialized.");
  initProcessorHealthCheck();
}
listenForPayments();
listenForHealthyProcessor();

console.log("✅ Worker initialized.");