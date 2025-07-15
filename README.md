# Rinha de Backend 2025 (WIP)

This project holds the code for my submission for [rinha-de-backend](https://github.com/zanfranceschi/rinha-de-backend-2025), a backend programming competition.

## Submission Status

- [] Elysia + Bun (WIP)
- [] Go (Planned)
- [] PHP (Planned)
- [] Dart (Planned)

## Requirements

### Challenge Overview

The Rinha de Backend 2025 challenge requires building a payment processing intermediary that optimizes for cost by routing payments to the most economical processor available. The system integrates with two payment processors:

- **Default processor**: Lower transaction fee, preferred choice
- **Fallback processor**: Higher transaction fee, used when default is unavailable

Both processors experience periodic instability (increased response times or service unavailability). The goal is to process payments as quickly as possible while minimizing fees.
