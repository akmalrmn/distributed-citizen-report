import express from 'express';
import cors from 'cors';
import { reportRoutes } from './routes/reports';
import { connectDatabase } from './db/connection';
import { connectRabbitMQ } from './services/messagePublisher';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoints for Kubernetes probes
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'report-service', timestamp: new Date().toISOString() });
});

app.get('/ready', (_, res) => {
  res.json({ status: 'ready', service: 'report-service' });
});

// Metrics endpoint for Prometheus
app.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`# HELP report_service_requests_total Total HTTP requests
# TYPE report_service_requests_total counter
report_service_requests_total{method="GET",path="/api/reports"} 0
report_service_requests_total{method="POST",path="/api/reports"} 0
# HELP report_service_up Service is up
# TYPE report_service_up gauge
report_service_up 1
`);
});

// API routes
app.use('/api/reports', reportRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    console.log('Starting Report Service...');

    await connectDatabase();
    console.log('Database connected');

    await connectRabbitMQ();
    console.log('RabbitMQ connected');

    app.listen(PORT, () => {
      console.log(`Report Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoint: http://localhost:${PORT}/api/reports`);
    });
  } catch (error) {
    console.error('Failed to start Report Service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();
