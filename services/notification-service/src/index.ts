import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { notificationRoutes } from './routes/notifications';
import { connectDatabase, closeDatabase } from './db/connection';
import { startNotificationConsumer } from './services/notificationConsumer';

const API_URL = process.env.VITE_API_URL || '';
const SESSION_SECRET = process.env.SESSION_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isProduction = process.env.NODE_ENV === 'production';
const cookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : isProduction;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required');
}

const app = express();
const PORT = process.env.PORT || 3003;
const redisClient = createClient({ url: REDIS_URL });
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'citizen:sess:'
});

app.set('trust proxy', 1);

app.use(cors({ origin: API_URL, credentials: true }));
app.use(express.json());

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

app.use(
  session({
    name: 'citizen.sid',
    store: redisStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

app.get('/ready', (_, res) => {
  res.json({ status: 'ready', service: 'notification-service' });
});

app.use('/api/notifications', notificationRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    console.log('Starting Notification Service...');

    await redisClient.connect();
    console.log('Redis connected');

    await connectDatabase();
    console.log('Database connected');

    await startNotificationConsumer();
    console.log('Notification consumer started');

    app.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start Notification Service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  redisClient.quit().catch((error) => {
    console.error('Failed to close Redis connection:', error);
  });
  closeDatabase().catch((error) => {
    console.error('Failed to close database connection:', error);
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  redisClient.quit().catch((error) => {
    console.error('Failed to close Redis connection:', error);
  });
  closeDatabase().catch((error) => {
    console.error('Failed to close database connection:', error);
  });
  process.exit(0);
});

start();
