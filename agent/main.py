import asyncio
import random
import json
from aiokafka import AIOKafkaProducer
from schemas import LogEvent, EventType
from datetime import datetime

KAFKA_BOOTSTRAP_SERVERS = "localhost:19092"
TOPIC = "observability.logs.raw.v1"

async def send_one(producer):
    # Determine event type
    event_type = random.choice(list(EventType))
    
    event = LogEvent(
        source_service=f"service-{random.randint(1, 10)}",
        target_service=f"service-{random.randint(1, 10)}",
        timestamp=datetime.utcnow(),
        metric_value=random.uniform(0.1, 5.0),
        event_type=event_type
    )
    
    # Serialize with Pydantic and encode to bytes
    value_json = event.model_dump_json().encode("utf-8") # Pydantic v2
    
    await producer.send_and_wait(TOPIC, value_json)
    # print(f"Sent: {event}")

async def main():
    print(f"Starting Traffic Agent. Target: {KAFKA_BOOTSTRAP_SERVERS} -> {TOPIC}")
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS
    )
    await producer.start()
    try:
        while True:
            await send_one(producer)
            await asyncio.sleep(0.1)
    except KeyboardInterrupt:
        pass
    finally:
        await producer.stop()
        print("Agent stopped.")

if __name__ == "__main__":
    asyncio.run(main())
