import { pullHealthA, pullHealthB } from "../shared/data/queue";
import { listenForHealth, listenForPayments } from "../shared/services/payment-store";
import { initProcessorHealthCheck } from "../shared/services/processor-health";

console.log("⚙️ Starting worker...");

initProcessorHealthCheck();

Promise.all([
  listenForPayments(),
  listenForHealth(pullHealthA),
  listenForHealth(pullHealthB),
]).then(() => {
  console.log("✅ Worker is running");
}).catch(error => {
  console.error("❗ Error starting worker:", error);
  process.exit(1);
});
