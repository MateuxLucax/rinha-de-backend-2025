import { Pull, Push } from "zeromq";
import { HEALTH_ZMQ_A as A_HEALTH_ZMQ, HEALTH_ZMQ_B as B_HEALTH_ZMQ, PAYMENTS_ZMQ, PUBLISH_HEALTH_PORT, PUBLISH_PAYMENTS_PORT } from "../environment";
import { fastEncode } from "../util";
import { record } from "@elysiajs/opentelemetry";
import type { Payment, PaymentProcessorType } from "../model/types";

const push = new Push();
push.bind(`tcp://127.0.0.1:${PUBLISH_PAYMENTS_PORT}`);

export async function sendToQueue(payment: Payment) {
  record('queue.send', async () => {
    try {
      await push.send(fastEncode(payment));
    } catch (error) {
      console.error("❗ Error sending to queue:", error);
    }
  });
}

const pushHealth = new Push();
push.bind(`tcp://127.0.0.1:${PUBLISH_HEALTH_PORT}`);

export async function sendProcessorHealth(processor: PaymentProcessorType){
  record('queue.send.health', async () => {
    try {
      await pushHealth.send(["health", processor]);
    } catch (error) {
      console.error("❗ Error sending processor health to queue:", error);
    }
  });
}

export const pull = new Pull();
pull.connect(`tcp://${PAYMENTS_ZMQ}`);

export const pullHealthA = new Pull();
pullHealthA.connect(`tcp://${A_HEALTH_ZMQ}`);

export const pullHealthB = new Pull();
pullHealthB.connect(`tcp://${B_HEALTH_ZMQ}`);