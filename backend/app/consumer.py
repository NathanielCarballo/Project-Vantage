import asyncio
import json
import logging
import os
import time

from aiokafka import AIOKafkaConsumer

from app.schemas import LogEvent, Severity
from app.services.city_manager import city_manager

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
TOPIC = "observability.logs.raw.v1"
CONSUMER_GROUP = "city-builder-v1"

# Map event_type strings to Severity enum
SEVERITY_MAP = {
    "ERROR": Severity.ERROR,
    "WARNING": Severity.WARNING,
    "INFO": Severity.INFO,
    "TRAFFIC": Severity.INFO,
    "HEARTBEAT": Severity.INFO,
}


async def consume_logs():
    """
    Kafka consumer loop that ingests log events into the CityStateManager.
    Runs as a background task alongside the broadcast_state loop.
    """
    print(f"Starting Kafka Consumer (bootstrap: {KAFKA_BOOTSTRAP_SERVERS})...")

    consumer = AIOKafkaConsumer(
        TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=CONSUMER_GROUP,
        auto_offset_reset="latest",
    )

    # Retry loop for initial connection
    max_retries = 5
    for attempt in range(max_retries):
        try:
            await consumer.start()
            print("Kafka Consumer Connected")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Consumer connection failed (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"Failed to connect to Kafka after {max_retries} attempts: {e}")
                return

    try:
        async for msg in consumer:
            try:
                # Step 1: Decode JSON
                data = json.loads(msg.value)

                # Step 2: Map incoming message to LogEvent schema
                # Producer sends: source_service, target_service, timestamp, metric_value, event_type
                event_type = data.get("event_type", "TRAFFIC")
                severity = SEVERITY_MAP.get(event_type, Severity.INFO)

                # Step 3: Validate Pydantic model
                log_event = LogEvent(
                    service_name=data.get("source_service", "unknown"),
                    target_service=data.get("target_service", "unknown"),
                    timestamp=time.time(),
                    metric_value=data.get("metric_value", 0.0),
                    severity=severity,
                    payload=data.get("payload", ""),
                )

                # Step 4: Ingest into city manager
                await city_manager.ingest(log_event)

            except Exception as e:
                # Resilience guardrail: Log and continue
                # Malformed messages should not crash the consumer loop
                logger.warning(f"Malformed log dropped: {e}")
                continue
    finally:
        await consumer.stop()
        logger.info("Kafka Consumer Stopped")
