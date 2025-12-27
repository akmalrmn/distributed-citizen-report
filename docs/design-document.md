# Dokumen Perancangan Sistem
# Aplikasi Pelaporan Warga Terdistribusi

---

## Halaman Sampul

**Nama Aplikasi:** Citizen Report - Aplikasi Pelaporan Warga

**Mata Kuliah:** IF4031 - Arsitektur Aplikasi Terdistribusi

**Kelompok:** [Nama Kelompok]

**Anggota:**
| No | NIM | Nama |
|----|-----|------|
| 1 | [NIM] | [Nama] |
| 2 | [NIM] | [Nama] |
| 3 | [NIM] | [Nama] |

**Tanggal:** Desember 2025

---

## Tabel Kontribusi Anggota

| Anggota | Kontribusi | Persentase |
|---------|-----------|------------|
| [Nama 1] | Backend Development, API Design, Database Schema | 33% |
| [Nama 2] | Frontend Development, UI/UX, Integration Testing | 33% |
| [Nama 3] | Infrastructure, Kubernetes, Load Testing, Documentation | 34% |

---

## 1. Deskripsi Umum Sistem

### 1.1 Latar Belakang

Aplikasi Pelaporan Warga adalah sistem terdistribusi yang memungkinkan warga kota dengan populasi sekitar 2,5 juta jiwa untuk melaporkan permasalahan di lingkungannya kepada pihak berwenang. Sistem ini dirancang untuk menangani berbagai jenis masalah seperti kriminalitas, kebersihan, kesehatan, dan perawatan fasilitas.

### 1.2 Tujuan Sistem

1. Menyediakan platform bagi warga untuk melaporkan masalah secara efisien
2. Memastikan laporan diteruskan ke departemen yang tepat secara otomatis
3. Memberikan transparansi status penyelesaian laporan kepada pelapor
4. Mendukung skalabilitas untuk menangani lonjakan laporan (misalnya saat bencana)

### 1.3 Cakupan Proof-of-Concept

PoC ini berfokus pada demonstrasi:
- **Fungsionalitas Utama:** Pengajuan laporan warga dengan routing otomatis ke departemen
- **Kualitas Utama:** Skalabilitas melalui auto-scaling pada Kubernetes

---

## 2. Diagram Arsitektur Sistem

### 2.1 Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│                    (React Web Application)                               │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      NGINX INGRESS                                 │  │
│  │               (Load Balancing, TLS Termination)                    │  │
│  └─────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│         ┌──────────────────────┼──────────────────────┐                 │
│         ▼                      ▼                      ▼                 │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐           │
│  │  Frontend   │       │   Report    │       │  Routing    │           │
│  │  Service    │       │   Service   │       │  Service    │           │
│  │  (2 pods)   │       │ (2-10 pods) │       │  (1 pod)    │           │
│  │             │       │    [HPA]    │       │             │           │
│  └─────────────┘       └──────┬──────┘       └──────┬──────┘           │
│                               │                      │                   │
│                               ▼                      │                   │
│                       ┌─────────────┐                │                   │
│                       │  RabbitMQ   │◄───────────────┘                   │
│                       │  (Message   │                                    │
│                       │   Broker)   │                                    │
│                       └──────┬──────┘                                    │
│                               │                                          │
│                               ▼                                          │
│                       ┌─────────────┐                                    │
│                       │ PostgreSQL  │                                    │
│                       │  Database   │                                    │
│                       └─────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Penjelasan Komponen

| Komponen | Tanggung Jawab |
|----------|----------------|
| **Frontend Service** | Menyajikan antarmuka web React untuk pengguna |
| **Report Service** | Menerima dan memproses laporan, publish ke message queue |
| **Routing Service** | Consume message dari queue, routing ke departemen yang tepat |
| **RabbitMQ** | Message broker untuk komunikasi asinkron antar service |
| **PostgreSQL** | Penyimpanan data laporan dan departemen |
| **NGINX Ingress** | Load balancing dan routing HTTP/HTTPS |

### 2.3 Aliran Data

```
1. Warga mengakses web application
2. Warga mengisi form laporan dan submit
3. Frontend mengirim POST request ke Report Service
4. Report Service menyimpan laporan ke PostgreSQL (status: submitted)
5. Report Service publish event ke RabbitMQ exchange
6. RabbitMQ routing ke queue berdasarkan kategori laporan
7. Routing Service consume dari queue
8. Routing Service update status laporan ke "routed" dan assign department
9. Warga dapat melihat status laporan yang terupdate
```

---

## 3. Daftar Teknologi dan Alasan Pemilihan

### 3.1 Backend Services

| Komponen | Teknologi | Alasan Pemilihan |
|----------|-----------|------------------|
| **Runtime** | Node.js 20 | Performa tinggi untuk I/O-bound operations, event-driven architecture cocok untuk messaging |
| **Language** | TypeScript | Type safety, better DX, error detection at compile time |
| **Framework** | Express.js | Mature, minimalis, ekosistem middleware yang luas |

### 3.2 Frontend

| Komponen | Teknologi | Alasan Pemilihan |
|----------|-----------|------------------|
| **Library** | React 18 | Component-based, virtual DOM, large ecosystem |
| **Build Tool** | Vite | Fast HMR, optimized production builds |
| **Styling** | Tailwind CSS | Utility-first, rapid prototyping, small bundle size |

### 3.3 Data Layer

| Komponen | Teknologi | Alasan Pemilihan |
|----------|-----------|------------------|
| **Database** | PostgreSQL 15 | ACID compliance, JSON support, proven reliability |
| **Message Broker** | RabbitMQ 3.12 | Flexible routing (topic exchange), message persistence, management UI |

**Mengapa RabbitMQ dibanding Kafka?**
- RabbitMQ lebih cocok untuk task queue pattern (proses sekali)
- Setup lebih sederhana (tidak perlu ZooKeeper)
- Topic exchange mendukung routing ke departemen berbeda
- Cukup untuk skala 2.5 juta pengguna dengan proper scaling

### 3.4 Infrastructure

| Komponen | Teknologi | Alasan Pemilihan |
|----------|-----------|------------------|
| **Container** | Docker | Standard containerization, reproducible builds |
| **Orchestration** | Kubernetes | Auto-scaling (HPA), self-healing, service discovery |
| **Ingress** | NGINX Ingress | Simple, performant, wide adoption |

### 3.5 Development & Testing

| Komponen | Teknologi | Alasan Pemilihan |
|----------|-----------|------------------|
| **Local Dev** | Docker Compose | Mudah menjalankan semua service lokal |
| **Load Testing** | k6 | JavaScript-based, metrics export, scenario support |

---

## 4. Pemilihan Fungsionalitas dan Kualitas PoC

### 4.1 Fungsionalitas yang Dipilih

**Fungsionalitas 1:** Pengajuan Laporan Warga
- Warga dapat mengajukan laporan dalam bentuk tertulis
- Laporan memiliki kategori (crime, cleanliness, health, infrastructure, other)
- Laporan memiliki visibility (public, private, anonymous)

**Fungsionalitas 5:** Routing ke Departemen
- Laporan otomatis diteruskan ke departemen yang sesuai berdasarkan kategori
- Departemen: Police, Sanitation, Health, Infrastructure, General Affairs

### 4.2 Kualitas yang Dipilih

**Skalabilitas (NFR 3):**
- Aplikasi mampu menangani lonjakan beban pengguna yang mendadak
- Menggunakan Horizontal Pod Autoscaler (HPA) untuk auto-scaling
- Dapat scale down ketika beban rendah untuk efisiensi resource

### 4.3 Alasan Pemilihan

1. **Representatif:** Fungsionalitas pengajuan laporan adalah core value proposition sistem
2. **Demonstrable:** Skalabilitas dapat didemonstrasikan secara visual dengan load test
3. **Kompleksitas Tepat:** Menunjukkan pola microservice dengan message queue
4. **Relevan untuk Kota Besar:** 2.5 juta warga membutuhkan kemampuan scaling

### 4.4 Fungsionalitas yang Tidak Diimplementasi (Scope Cut)

| Fungsionalitas | Alasan Tidak Diimplementasi |
|----------------|----------------------------|
| Authentication | Menggunakan hardcoded user untuk simplifikasi PoC |
| Notification Service | Fokus pada core flow, notifikasi adalah enhancement |
| Upvote System | Tidak kritis untuk demonstrasi arsitektur |
| Report Escalation | Dapat diimplementasi sebagai extension |
| External Integration | Membutuhkan sistem eksternal yang tidak tersedia |

---

## 5. Implementasi Proof-of-Concept

### 5.1 Struktur Proyek

```
distributed-citizen-report/
├── services/
│   ├── report-service/          # Express API untuk laporan
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   └── db/             # Database connection & migrations
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── routing-service/         # Message consumer
│       ├── src/
│       │   ├── index.ts
│       │   └── consumers/      # RabbitMQ consumers
│       ├── Dockerfile
│       └── package.json
│
├── frontend/                    # React application
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── api/               # API client
│   │   └── App.tsx            # Main app
│   ├── Dockerfile
│   └── package.json
│
├── k8s/                        # Kubernetes manifests
│   └── base/
│       ├── namespace.yaml
│       ├── services/
│       │   ├── report-service/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   └── hpa.yaml     # Auto-scaling config
│       │   └── ...
│       └── data/
│           ├── postgres.yaml
│           └── rabbitmq.yaml
│
├── load-testing/
│   └── k6-script.js            # Load test script
│
└── docker-compose.yml          # Local development
```

### 5.2 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/reports | Membuat laporan baru |
| GET | /api/reports | Mengambil daftar laporan publik |
| GET | /api/reports/:id | Mengambil detail laporan |
| PATCH | /api/reports/:id/status | Update status laporan |
| GET | /health | Health check untuk K8s |
| GET | /ready | Readiness check untuk K8s |

### 5.3 Database Schema

```sql
-- Tabel departments
CREATE TABLE departments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel reports
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    reporter_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category report_category NOT NULL,
    visibility report_visibility NOT NULL,
    status report_status NOT NULL DEFAULT 'submitted',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    assigned_department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.4 Message Flow (RabbitMQ)

```
Report Service                    RabbitMQ                      Routing Service
     │                               │                               │
     │  publish(report.created)      │                               │
     │──────────────────────────────>│                               │
     │                               │                               │
     │                    ┌──────────┴──────────┐                    │
     │                    │  reports.exchange   │                    │
     │                    │   (topic type)      │                    │
     │                    └──────────┬──────────┘                    │
     │                               │                               │
     │            ┌──────────────────┼──────────────────┐           │
     │            │                  │                  │            │
     │            ▼                  ▼                  ▼            │
     │    reports.police    reports.sanitation   reports.general    │
     │            │                  │                  │            │
     │            └──────────────────┼──────────────────┘            │
     │                               │                               │
     │                               │  consume(report.created)      │
     │                               │<──────────────────────────────│
     │                               │                               │
```

### 5.5 Horizontal Pod Autoscaler Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: report-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 60
```

**Penjelasan:**
- `minReplicas: 2` - Minimum 2 pod untuk high availability
- `maxReplicas: 10` - Maksimum 10 pod saat peak load
- `averageUtilization: 50` - Scale up ketika CPU > 50%
- `scaleUp.stabilizationWindowSeconds: 0` - Scale up segera
- `scaleDown.stabilizationWindowSeconds: 60` - Tunggu 60 detik sebelum scale down

---

## 6. Dokumentasi Hasil Implementasi

### 6.1 Tautan Repository

**Source Code:** [GitHub Repository URL]

### 6.2 Cara Menjalankan Aplikasi

#### Local Development (Docker Compose)

```bash
# Clone repository
git clone [repository-url]
cd distributed-citizen-report

# Start infrastructure (PostgreSQL, RabbitMQ, Redis)
docker-compose up -d postgres rabbitmq redis

# Install dependencies
npm install

# Start services
npm run dev:report    # Terminal 1
npm run dev:routing   # Terminal 2
npm run dev:frontend  # Terminal 3
```

#### Kubernetes Deployment

```bash
# Create namespace and apply configs
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/configmap.yaml

# Deploy data services
kubectl apply -f k8s/base/data/

# Wait for data services to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n citizen-report

# Deploy application services
kubectl apply -f k8s/base/services/ -R

# Deploy ingress
kubectl apply -f k8s/base/ingress/
```

### 6.3 Demo Skalabilitas

```bash
# Watch pods scaling in one terminal
kubectl get pods -n citizen-report -w

# Run load test in another terminal
k6 run load-testing/k6-script.js

# Watch HPA metrics
kubectl get hpa -n citizen-report -w
```

**Expected Behavior:**
1. Pods mulai dengan 2 replicas
2. Saat load meningkat (>50% CPU), HPA menambah pods
3. Peak load: bisa mencapai 6-10 pods
4. Setelah load menurun, pods berkurang kembali

---

## 7. Asumsi

1. **Autentikasi:** Untuk simplifikasi PoC, tidak mengimplementasi full authentication. Reporter ID di-hardcode atau null.

2. **Media Upload:** Laporan hanya berupa teks. Upload gambar/video tidak diimplementasi untuk menyederhanakan scope.

3. **Single Database:** Menggunakan satu instance PostgreSQL tanpa replikasi. Untuk production perlu read replicas.

4. **Single RabbitMQ:** Menggunakan satu instance RabbitMQ. Untuk production perlu clustering.

5. **Cloud Provider:** Demonstrasi menggunakan GKE. Dapat diadaptasi untuk EKS/AKS.

6. **Concurrent Users:** Estimasi 1-5% dari 2.5 juta warga aktif secara bersamaan (25,000-125,000 concurrent).

7. **Report Volume:** Rata-rata 1,000-5,000 laporan/hari, peak hingga 50,000 saat darurat.

8. **Response Time Target:** < 500ms untuk submission, < 200ms untuk listing.

---

## 8. Kesimpulan

Proof-of-Concept ini berhasil mendemonstrasikan:

1. **Arsitektur Microservices:** Pemisahan concern antara Report Service dan Routing Service
2. **Message-Driven Communication:** Penggunaan RabbitMQ untuk routing asinkron ke departemen
3. **Auto-Scaling:** Horizontal Pod Autoscaler yang merespons load dengan menambah/mengurangi pods
4. **Container Orchestration:** Deployment menggunakan Kubernetes dengan proper health checks dan resource limits

Arsitektur ini dapat di-extend untuk fitur lengkap seperti:
- Notification Service untuk push notification
- Analytics Service untuk dashboard
- Authentication Service dengan OAuth/JWT
- Media Service untuk upload gambar/video

---

## Lampiran

### A. Deployment Commands Quick Reference

```bash
# Build images
docker build -t citizen-report/report-service ./services/report-service
docker build -t citizen-report/routing-service ./services/routing-service
docker build -t citizen-report/frontend ./frontend

# Push to registry (sesuaikan dengan registry Anda)
docker tag citizen-report/report-service gcr.io/[PROJECT]/report-service
docker push gcr.io/[PROJECT]/report-service

# Deploy to GKE
gcloud container clusters get-credentials [CLUSTER] --zone [ZONE]
kubectl apply -f k8s/base/ -R

# Verify deployment
kubectl get pods -n citizen-report
kubectl get services -n citizen-report
kubectl get hpa -n citizen-report
```

### B. Monitoring Commands

```bash
# Pod status
kubectl get pods -n citizen-report -w

# HPA status
kubectl describe hpa report-service-hpa -n citizen-report

# Logs
kubectl logs -f deployment/report-service -n citizen-report
kubectl logs -f deployment/routing-service -n citizen-report

# Resource usage
kubectl top pods -n citizen-report
```

---

**Catatan:** Dokumen ini dibuat dengan bantuan LLM (Claude) untuk penulisan. Implementasi kode dipahami dan divalidasi oleh tim.
