# Citizen Report - Distributed Application

Aplikasi Pelaporan Warga berbasis microservices untuk tugas besar IF4031 - Arsitektur Aplikasi Terdistribusi.

## Deskripsi

Sistem terdistribusi yang memfasilitasi warga kota (populasi ~2.5 juta) untuk melaporkan permasalahan di lingkungan sekitar kepada pihak berwenang. Laporan secara otomatis di-routing ke departemen yang sesuai berdasarkan kategori.

## Arsitektur

```
┌─────────────┐     ┌─────────────────────────────────────────┐
│   Client    │     │           Kubernetes Cluster            │
│   (React)   │────▶│  ┌─────────┐  ┌──────────────────────┐  │
└─────────────┘     │  │ Ingress │  │   Application Layer  │  │
                    │  │ (NGINX) │──│  ┌────────────────┐  │  │
                    │  └─────────┘  │  │ Report Service │  │  │
                    │               │  └───────┬────────┘  │  │
                    │               │          │           │  │
                    │  ┌─────────┐  │  ┌───────▼────────┐  │  │
                    │  │RabbitMQ │◀─│  │Routing Service │  │  │
                    │  └─────────┘  │  └────────────────┘  │  │
                    │               └──────────────────────┘  │
                    │  ┌─────────┐  ┌─────────┐              │
                    │  │PostgreSQL│  │  Redis  │              │
                    │  └─────────┘  └─────────┘              │
                    └─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript |
| Backend | Node.js 20, Express.js, TypeScript |
| Database | PostgreSQL 15 |
| Message Broker | RabbitMQ 3.12 |
| Cache | Redis 7 |
| Container | Docker |
| Orchestration | Kubernetes / Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/akmalrmn/distributed-citizen-report.git
cd distributed-citizen-report

# Start all services
docker compose up -d --build

# Check status
docker compose ps
```

### Access URLs (Local)

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | - |
| API | http://localhost:3002 | - |
| RabbitMQ Dashboard | http://localhost:15672 | citizen / citizen123 |

### Live Demo (VPS)

| Service | URL |
|---------|-----|
| Frontend | http://152.42.228.39:3001 |
| API | http://152.42.228.39:3002 |
| RabbitMQ Dashboard | http://152.42.228.39:15672 |

### Default Test Accounts

| Username | Password | Role |
|----------|----------|------|
| police_dept | password123 | Department Crime |
| cleanliness_dept | password123 | Department Cleanliness |
| health_dept | password123 | Department Health |
| infrastructure_dept | password123 | Department Infrastructure |
| others_dept | password123 | Department Other |

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/logout` | Logout |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | Create new report (multipart/form-data) |
| GET | `/api/reports` | List public reports |
| GET | `/api/reports/private` | List private reports (auth required) |
| GET | `/api/reports/:id` | Get report detail |
| PATCH | `/api/reports/:id/status` | Update report status |

### Request Example: Create Report

```bash
curl -X POST http://localhost:3002/api/reports \
  -F "title=Jalan Rusak" \
  -F "description=Terdapat lubang besar di jalan utama" \
  -F "category=infrastructure" \
  -F "visibility=public" \
  -F "reporterId=user-id-here" \
  -F "files=@photo.jpg"
```

## Project Structure

```
distributed-citizen-report/
├── services/
│   ├── report-service/       # REST API service
│   │   ├── src/
│   │   │   ├── index.ts      # Express entry point
│   │   │   ├── routes/       # API routes
│   │   │   ├── services/     # Business logic
│   │   │   └── db/           # Database migrations
│   │   └── Dockerfile
│   └── routing-service/      # Message consumer
│       ├── src/
│       │   ├── index.ts
│       │   └── consumers/    # RabbitMQ consumers
│       └── Dockerfile
├── frontend/                 # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── api/             # API client
│   │   └── App.tsx
│   └── Dockerfile
├── k8s/                     # Kubernetes manifests
│   └── base/
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secrets.yaml
│       ├── services/        # App deployments
│       ├── data/            # Database deployments
│       └── ingress/         # Ingress config
├── load-testing/            # k6 load test scripts
├── docs/                    # Documentation
├── docker-compose.yml       # Local development
└── README.md
```

## Load Testing

```bash
# Install k6
sudo apt install k6

# Run load test
k6 run -e BASE_URL=http://localhost:3002 load-testing/k6-script.js
```

## Kubernetes Deployment (Optional)

```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# Deploy
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/

# Watch pods
kubectl get pods -n citizen-report -w
```

## Environment Variables

### Report Service

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3002 | API port |
| DATABASE_URL | - | PostgreSQL connection string |
| RABBITMQ_URL | - | RabbitMQ connection string |
| SESSION_SECRET | secret | Session encryption key |

### Routing Service

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection string |
| RABBITMQ_URL | - | RabbitMQ connection string |
| DEPARTMENT | general | Department to consume (or "all") |

## Features

- [x] User authentication (register/login)
- [x] Submit reports with attachments
- [x] Public/private/anonymous visibility
- [x] Automatic routing via RabbitMQ
- [x] Department-based access control
- [x] Report status management
- [x] Pagination and filtering
- [ ] Real-time notifications
- [ ] Auto-escalation
- [ ] Analytics dashboard

## Team

| Name | NIM |
|------|-----|
| Benardo | 13522055 |
| Marvin Scifo Y. Hutahaean | 13522110 |
| Mohammad Akmal Ramadan | 13522161 |

---

IF4031 - Arsitektur Aplikasi Terdistribusi
Institut Teknologi Bandung - 2026
