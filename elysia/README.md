# Elysia

This implementation of the Rinha de Backend 2025 is built using [Elysia](https://elysiajs.com/), a modern and lightweight web framework.

## Architecture

This diagram gives an overview of the architecture:

```mermaid
flowchart TD
  K6 --> |Load Testing| Gateway[Gateway]
  Gateway[Gateway] -->|HTTP Requests| API-1[API-1]
  Gateway[Gateway] -->|HTTP Requests| API-2[API-2]
  API-1[API-1] -->|Enqueue| Valkey[(Valkey)]
  API-2[API-2] -->|Enqueue| Valkey[(Valkey)]
  Worker-1[Worker-1] -->|Dequeue| Valkey[(Valkey)]
  Worker-2[Worker-2] -->|Dequeue| Valkey[(Valkey)]
  Worker-1[Worker-1] -->|Process Payments| Processors[Payment Processors]
  Worker-2[Worker-2] -->|Process Payments| Processors[Payment Processors]
```

The pillars of this architecture are separate HTTP requests API from workers that handle payment processing, using Valkey for data storage and queue management, simplifying the overall design.

## Process Flows

### Enqueue Process

The enqueue process is initiated by the client through the API, which forwards the request to Valkey for queuing. This splits the responsabilities between receiving the request and processing it later.

```mermaid
sequenceDiagram
    Client->>Gateway: HTTP Request
    Gateway->>API: Forward Request
    API->>Valkey: Enqueue Payment
    Valkey-->>API: Confirm Enqueue
    API-->>Gateway: Response
    Gateway-->>Client: Success Response
```

### Dequeue and Payment Processing

The worker retrieves the payment from Valkey, checks which processor to use (given the healthchecks and performance metrics), and processes the payment. If any fail happens, it will reenqueue the payment for later processing.

```mermaid
sequenceDiagram
    Worker->>Valkey: Dequeue Payment
    Valkey-->>Worker: Payment Data
    Worker->>Worker: Check Best Processor
    Worker->>Default Processor: Process Payment
    alt Default Processor Fails
        Default Processor--xWorker: Failure
        Worker->>Fallback Processor: Process Payment
        alt Fallback Processor Fails
            Fallback Processor--xWorker: Failure
            Worker->>Valkey: Re-enqueue Payment
        else Success
            Fallback Processor-->>Worker: Success
            Worker->>Valkey: Store Result
        end
    else Success
        Default Processor-->>Worker: Success
        Worker->>Valkey: Store Result
    end
```

### Leader Election and Health Check

This is required to ensure that the payment processors do not rate limit health checks and performance metrics. The worker tries to acquire a leader lock from Valkey, and if successful, it performs health checks on the processors and stores the best performing processor information. If not the leader, it retrieves the best processor info from Valkey.

```mermaid
sequenceDiagram
    Worker->>Valkey: Try Acquire Leader Lock
    alt Is Leader
        Valkey-->>Worker: Leader Status Granted
        Worker->>Default Processor: Health Check
        Worker->>Fallback Processor: Health Check
        Worker->>Worker: Compare Performance
        Worker->>Valkey: Store Best Processor Info
    else Not Leader
        Valkey-->>Worker: Not Leader
        Worker->>Valkey: Get Best Processor Info
    end
```

## Building and Running

This project uses the built-in Bun's build system, this increases the performance and lowers the memory footprint of the application. To build and run the project, you can use the following commands:

```bash 
docker compose up --build
```

This will expose the port `9999` to client requests. Check the `/test/` folder on this repository for the K6 load testing scripts.