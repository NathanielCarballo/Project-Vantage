"""
Mock Producer for Log-Metropolis.
Generates synthetic log events and sends them to Redpanda/Kafka.

Usage:
    python agent/mock_producer.py
"""
from main import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())
