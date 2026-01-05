# Infrastructure (Redpanda)

We use **Redpanda** as a drop-in replacement for Kafka.

## ⚠️ Critical Configuration (The "Split Listener")
To allow local Python scripts (Host) to talk to Redpanda (Docker), we use a split-listener config:
- **Internal (Docker Network):** `0.0.0.0:9092`
- **External (Host/Windows):** `localhost:19092`

**Do not change the advertised listeners in `docker-compose.yml` unless you understand this routing.**