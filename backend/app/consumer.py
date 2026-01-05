import asyncio
import json
from aiokafka import AIOKafkaConsumer
from .schemas import LogEvent

KAFKA_BOOTSTRAP_SERVERS = "localhost:19092"
TOPIC = "observability.logs.raw.v1"


async def consume_logs():
    print(f"Starting Kafka Consumer. Source: {KAFKA_BOOTSTRAP_SERVERS} <- {TOPIC}")

    consumer = AIOKafkaConsumer(
        TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="log-metropolis-backend",
        auto_offset_reset="earliest",
    )

    await consumer.start()
    try:
        async for msg in consumer:
            raw_json = msg.value.decode("utf-8")
            log_event = LogEvent.model_validate_json(raw_json)
            print(f"[RECEIVED] {log_event}")
    finally:
        await consumer.stop()
        print("Consumer stopped.")
