# AI-Driven Smart ICU Patient Monitoring & Hospital Workflow Automation System

A production-ready, microservices-based Progressive Web App (PWA) for real-time ICU patient monitoring, AI-powered risk prediction, smart bed allocation, and hospital workflow automation.

## Architecture

```
icu-ai-system/
├── frontend/        → Next.js 15 + React 19 + Tailwind CSS + Recharts + Socket.io + PWA
├── backend/         → Node.js + Express + MongoDB + Mongoose + Socket.io + JWT
└── ai-service/      → Python FastAPI + scikit-learn (Random Forest + Rule-based ensemble)
```

## Key Features

### Core Monitoring
- **Real-time vitals dashboard** with WebSocket auto-updates every 10s
- **Live animated charts** (Heart Rate, SpO2, Temperature, Blood Pressure) via Recharts
- **AI risk prediction** combining rule-based scoring + Random Forest ML model
- **Critical alerts** with visual indicators, toast notifications, and optional voice alerts

### Smart Bed Management (ICU + Normal Rooms)
- **Severity-based priority allocation** — Critical patients auto-routed to ICU
- **Multi-criteria scoring** — Room suitability, proximity to nursing station, equipment match
- **Isolation matching** — Infectious patients directed to isolation rooms
- **Step-down protocol** — AI recommends moving stable ICU patients to free capacity
- **Escalation alerts** — Critical patients in normal rooms flagged for ICU transfer
- **Ward load balancing** — Occupancy monitoring across all wards
- **Room types**: ICU, Normal, Isolation, Step-Down
- **Bed features tracking**: Ventilator, Monitor, Oxygen, Isolation, Near Nursing Station

### Hospital Workflow
- **Role-based authentication** (Doctor: full access, Nurse: read-only)
- **Staff management** with shift tracking, task assignment, bed allocation
- **Alert management** with acknowledge workflow
- **PDF report export** (patient vitals charts via html2canvas + jsPDF)
- **Voice alerts** for critical events (Web Speech API)

### PWA & Performance
- **Installable PWA** with offline dashboard support
- **Service worker** caches dashboard shell and API responses
- **Dark mode** toggle
- **Responsive design** for mobile/tablet (nurses on rounds)
- **Loading skeletons**, glassmorphism cards, gradient UI

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- MongoDB (local or Docker)

### 1. Start MongoDB

```bash
cd icu-ai-system
docker-compose up db -d
```

Or use local MongoDB running on `mongodb://localhost:27017`.

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# AI Service
cd ../ai-service
pip install -r requirements.txt
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates:
- 8 sample patients (ICU, Normal, Isolation, Step-Down)
- 22 beds across 5 wards (ICU-A, ICU-B, General-A, General-B, Isolation, Step-Down)
- 5 staff members (doctors, nurses)
- Initial alerts and 1-hour vitals history

### 4. Start All Services

**Terminal 1 — Backend (port 3001):**
```bash
cd backend
npm run dev
```

**Terminal 2 — AI Service (port 8000):**
```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

**Terminal 3 — Frontend (port 3000):**
```bash
cd frontend
npm run dev
```

### 5. Open the App

Visit **http://localhost:3000**

**Demo Credentials:**
| Email | Password | Role |
|-------|----------|------|
| doctor@test.com | 123 | Doctor (full access) |
| nurse@test.com | 123 | Nurse (read-only) |

## Docker Compose (Full Stack)

```bash
docker-compose up --build
```

This starts MongoDB, Backend, AI Service, and Frontend together.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Get current user |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List all patients (filter: status, roomType, search) |
| GET | `/api/patients/:id` | Get single patient |
| POST | `/api/patients` | Create patient (doctor only) |
| PUT | `/api/patients/:id` | Update patient (doctor only) |
| DELETE | `/api/patients/:id` | Discharge patient (doctor only) |
| GET | `/api/patients/stats/dashboard` | Dashboard statistics |

### Vitals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vitals` | Record vitals (triggers AI + alerts) |
| GET | `/api/vitals/:patientId` | Get vitals history |
| GET | `/api/vitals/latest/all` | Latest vitals for all patients |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts (filter: severity) |
| GET | `/api/alerts/recent` | Last 5 alerts |
| PUT | `/api/alerts/:id/acknowledge` | Acknowledge alert |

### Bed Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/beds` | List all beds (filter: roomType, status, ward) |
| GET | `/api/beds/stats` | Bed occupancy statistics |
| POST | `/api/beds/recommend` | AI-powered bed recommendation |
| POST | `/api/beds/allocate` | Allocate bed to patient (doctor only) |
| POST | `/api/beds/release` | Release bed (doctor only) |
| GET | `/api/beds/recommendations/step-down` | Step-down recommendations |
| GET | `/api/beds/recommendations/escalation` | Escalation recommendations |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff` | List staff (filter: role, shift) |
| POST | `/api/staff` | Create staff member |
| PUT | `/api/staff/:id/tasks` | Update staff tasks |

### AI Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Risk prediction from vitals |
| POST | `/recommend-bed` | Bed type recommendation |
| POST | `/batch-predict` | Batch risk prediction |
| GET | `/health` | Service health check |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `updateVitals` | Server → Client | Real-time vitals update for all patients |
| `patientVitals` | Server → Room | Patient-specific vitals update |
| `newAlert` | Server → Client | New alert created |
| `alertAcknowledged` | Server → Client | Alert was acknowledged |
| `patientAdded` | Server → Client | New patient added |
| `patientUpdated` | Server → Client | Patient data changed |
| `bedAllocated` | Server → Client | Bed was allocated |
| `bedReleased` | Server → Client | Bed was released |
| `joinPatientRoom` | Client → Server | Subscribe to patient updates |

## Smart Bed Allocation Algorithm

The system uses a multi-criteria scoring algorithm:

1. **Room Suitability (30%)** — Match patient severity to room type
2. **Proximity Score (20%)** — Critical patients near nursing stations
3. **Feature Matching (25%)** — Ventilator, monitor, oxygen requirements
4. **Isolation Matching (15%)** — Infection control requirements
5. **Load Balancing (10%)** — Distribute across wards evenly

Additional intelligence:
- **Step-Down Protocol**: Stable ICU patients (risk < 0.3) flagged for step-down transfer
- **Escalation Protocol**: Critical non-ICU patients flagged for ICU transfer
- **AI Room Recommendation**: ML model suggests optimal room type

## AI Risk Prediction

Ensemble approach: **60% rule-based + 40% Random Forest ML**

Rule-based thresholds:
- Heart Rate > 110 bpm → +0.25-0.35 risk
- SpO2 < 92% → +0.30-0.45 risk
- Temperature > 38.5°C → +0.20-0.35 risk
- BP Systolic > 160 or < 90 → +0.10-0.20 risk
- Respiratory Rate > 25 → +0.10-0.20 risk

Risk Levels:
- **Low** (0 - 0.4): Green badge
- **Medium** (0.4 - 0.7): Yellow badge
- **Critical** (0.7 - 1.0): Red badge + alert generated

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts |
| State | React Context + WebSocket |
| PWA | next-pwa, Service Workers |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT (24h expiry) |
| AI/ML | FastAPI, scikit-learn (Random Forest), NumPy |
| DevOps | Docker, Docker Compose |
| Monitoring | Winston (logging), Rate Limiting |

## License

MIT
