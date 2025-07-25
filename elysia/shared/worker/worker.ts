import { runPaymentProcessor } from "../services/payment-store";
import { initProcessorHealthCheck } from "../services/processor-health";

console.log("⚙️ Starting worker...");

while (true) {
  try {
    runPaymentProcessor();
    initProcessorHealthCheck();
  } catch (error) {
    console.error("Error in worker loop:", error);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}