import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://citizen:citizen123@localhost:5432/citizen_report';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('Database connection closed');
}
