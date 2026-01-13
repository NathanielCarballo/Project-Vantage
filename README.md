# 🔭 Project: Vantage

> **Spatial Observability Engine.** > *Real-time 3D infrastructure visualization for distributed systems.*

**Vantage** (formerly Log-Metropolis) is a high-fidelity observability tool that maps invisible server metrics into a living, breathing cyberpunk topology. It creates immediate "situational awareness" by translating abstract log streams into physical intuition.


## 🗺️ The Visual Dictionary

Unlike traditional dashboards, Vantage separates **Capacity** from **Activity**:

| Visual Element | Infrastructure Metric | Metaphor |
| :--- | :--- | :--- |
| **Building Height** | **Pod Count (Capacity)** | *Static.* A tall tower is a massive cluster; a small hut is a single instance. |
| **Orbital Rings** | **Request Volume (Load)** | *Kinetic.* Spinning halos represent active throughput (RPS). Faster spin = Higher load. |
| **Building Color** | **Health Status** | *Status.* **Cyan** = Nominal. **Red** = Critical Error Rate. |
| **Particles** | **HTTP Requests** | *Flow.* Individual packets traveling from ingress to service. |


## 🏗️ Architecture

We utilize a decoupled, high-throughput, one-way data pipeline designed to handle 10,000+ events/second without backpressure.

```mermaid
graph TD
    subgraph Data Plane
    A[Log Agent / Simulator] -->|JSON Event| B(Redpanda Broker)
    end
    
    subgraph Control Plane
    B -->|Consumer Group| C{Vantage Engine (FastAPI)}
    C -->|State Aggregation| C
    end
    
    subgraph View Plane
    C -->|WebSocket (10Hz)| D[React Client]
    D -->|React Three Fiber| E[3D Canvas]
    end
```


## 🛠️ Tech Stack

- **Core**: Python 3.10+, TypeScript
- **Backend**: FastAPI (AsyncIO), Pydantic
- **Broker**: Redpanda (Kafka-compatible)
- **Frontend**: React, React Three Fiber (R3F), Drei, Zustand
- **Graphics**: InstancedMesh (WebGL) for 60FPS performance at 20k+ particles
- **Infra**: Docker Compose


## 🚀 Development Status

- [x] Phase 1: The Nervous System (Docker/Redpanda Pipeline)
- [x] Phase 2: The Heartbeat (State Aggregation & Decay Logic)
- [x] Phase 3: The City (Procedural Grid & R3F Rendering)
- [x] Phase 4: The Traffic (Particle Systems & Bloom)
- [x] Phase 5: The Commander (RTS Camera & Raycasting)
- [x] Phase 6: Resilience (Entropy Loops & Thread Safety)
- [ ] Phase 7: The Operator (Current Focus)
    - Visual Refactor: "Kinetic Halo" system for load visualization.
    - Simulation: Advanced cluster simulator for scaling events.
    - UI: "Black Box" log terminal and global health HUD.


## ⚡ Quick Start

Start Infrastructure (Redpanda):
```Bash
cd infra
docker-compose up -d
```
---
Start Engine (Consumer/Backend):
```Bash
cd backend
# Requires Python 3.10+
pip install -r requirements.txt
uvicorn app.main:app --reload
```
---
Start Client (Frontend):
```Bash
cd frontend
npm install
npm run dev
```
---
Ignite Traffic (Simulator):
```Bash
# Generates realistic cluster scaling and log noise
python agent/mock_producer.py
```
