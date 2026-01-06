"""
Integration Verification Script for Log-Metropolis Phase 2.

This script verifies that:
1. Logs sent to Redpanda are consumed by the backend
2. The CityStateManager processes the logs
3. WebSocket broadcasts include the new building data

Prerequisites:
- Redpanda running (docker-compose up -d in infra/)
- Backend running (uvicorn app.main:app --reload in backend/)

Usage:
    python scripts/verify_integration.py
"""
import asyncio
import json
import time
from aiokafka import AIOKafkaProducer
import websockets

KAFKA_BOOTSTRAP = "localhost:19092"
TOPIC = "observability.logs.raw.v1"
WS_URL = "ws://localhost:8000/ws"


async def send_test_events(num_events: int = 5):
    """Send test log events to Kafka."""
    print(f"\n[Producer] Connecting to Kafka at {KAFKA_BOOTSTRAP}...")
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
    await producer.start()
    print("[Producer] Connected!")

    service_names = ["test-api", "test-auth", "test-db"]

    try:
        for i in range(num_events):
            event = {
                "source_service": service_names[i % len(service_names)],
                "target_service": "test-downstream",
                "timestamp": time.time(),
                "metric_value": 1.0 + (i * 0.5),
                "event_type": "ERROR" if i == 2 else "TRAFFIC",
                "severity": "ERROR" if i == 2 else "INFO",
                "payload": f"Test event {i + 1}",
            }
            value = json.dumps(event).encode("utf-8")
            await producer.send_and_wait(TOPIC, value)
            print(f"[Producer] Sent event {i + 1}: {event['source_service']} ({event['event_type']})")
            await asyncio.sleep(0.1)

        print(f"[Producer] Sent {num_events} events successfully!")
    finally:
        await producer.stop()


async def listen_websocket(timeout: float = 5.0):
    """Listen to WebSocket and verify city state updates."""
    print(f"\n[WebSocket] Connecting to {WS_URL}...")

    try:
        async with websockets.connect(WS_URL) as ws:
            print("[WebSocket] Connected!")

            start_time = time.time()
            messages_received = 0
            buildings_seen = set()

            while time.time() - start_time < timeout:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    data = json.loads(msg)
                    messages_received += 1

                    tick_id = data.get("tick_id", 0)
                    buildings = data.get("buildings", {})
                    stats = data.get("global_stats", {})

                    for name in buildings:
                        buildings_seen.add(name)

                    if buildings:
                        print(
                            f"[WebSocket] Tick {tick_id}: "
                            f"{len(buildings)} buildings, "
                            f"RPS={stats.get('total_rps', 0)}, "
                            f"Errors={stats.get('total_errors', 0)}"
                        )

                        # Print building details
                        for name, b in buildings.items():
                            if b.get("height", 0) > 0 or b.get("health", 0) > 0:
                                print(
                                    f"    - {name}: height={b['height']:.2f}, "
                                    f"health={b['health']:.2f}"
                                )

                except asyncio.TimeoutError:
                    continue

            print(f"\n[WebSocket] Summary:")
            print(f"  - Messages received: {messages_received}")
            print(f"  - Buildings observed: {buildings_seen or 'None'}")

            return len(buildings_seen) > 0

    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        return False


async def main():
    print("=" * 60)
    print("Log-Metropolis Integration Verification")
    print("=" * 60)

    # Start WebSocket listener and producer concurrently
    ws_task = asyncio.create_task(listen_websocket(timeout=8.0))

    # Give WebSocket time to connect
    await asyncio.sleep(1.0)

    # Send test events
    await send_test_events(num_events=10)

    # Wait for WebSocket to finish listening
    success = await ws_task

    print("\n" + "=" * 60)
    if success:
        print("VERIFICATION PASSED: Events flowing through pipeline!")
        print("  Producer -> Redpanda -> Consumer -> CityManager -> WebSocket")
    else:
        print("VERIFICATION FAILED: No buildings observed in WebSocket data.")
        print("  Check that:")
        print("    1. Redpanda is running (docker-compose up -d in infra/)")
        print("    2. Backend is running (uvicorn app.main:app in backend/)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
