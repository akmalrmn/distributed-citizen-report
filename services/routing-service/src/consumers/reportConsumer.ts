import amqp, { Channel, Connection } from 'amqplib';
import { Pool } from 'pg';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://citizen:citizen123@localhost:5672';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://citizen:citizen123@localhost:5432/citizen_report';

const pool = new Pool({ connectionString: DATABASE_URL });

interface ReportCreatedEvent {
  eventType: string;
  timestamp: string;
  data: {
    reportId: string;
    category: string;
    title: string;
    description: string;
    visibility: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

async function processReport(department: string, event: ReportCreatedEvent): Promise<void> {
  const { reportId, category, title } = event.data;

  console.log(`[${department}] Processing report: ${reportId}`);
  console.log(`  Category: ${category}`);
  console.log(`  Title: ${title}`);

  try {
    // Get department ID from database
    const deptResult = await pool.query(
      'SELECT id, name FROM departments WHERE code = $1',
      [department]
    );

    if (deptResult.rows.length === 0) {
      console.error(`[${department}] Department not found in database`);
      return;
    }

    const dept = deptResult.rows[0];

    // Update report with assigned department and status
    const updateResult = await pool.query(
      `UPDATE reports
       SET assigned_department_id = $1, status = 'routed', updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [dept.id, reportId]
    );

    if (updateResult.rows.length === 0) {
      console.error(`[${department}] Report ${reportId} not found`);
      return;
    }

    // Record status change in history
    await pool.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, notes)
       VALUES ($1, 'submitted', 'routed', $2)`,
      [reportId, `Routed to ${dept.name}`]
    );

    console.log(`[${department}] Report ${reportId} routed successfully to ${dept.name}`);
  } catch (error) {
    console.error(`[${department}] Error processing report ${reportId}:`, error);
    throw error;
  }
}

export async function startConsumer(department: string): Promise<void> {
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  const queue = `reports.${department}`;
  await channel.assertQueue(queue, { durable: true });

  // Prefetch 1 message at a time for fair dispatch
  channel.prefetch(1);

  console.log(`[${department}] Consumer started, waiting for messages...`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event: ReportCreatedEvent = JSON.parse(msg.content.toString());

      if (event.eventType === 'REPORT_CREATED') {
        await processReport(department, event);
      } else {
        console.log(`[${department}] Unknown event type: ${event.eventType}`);
      }

      // Acknowledge message after successful processing
      channel.ack(msg);
    } catch (error) {
      console.error(`[${department}] Error processing message:`, error);
      // Negative acknowledge and requeue the message
      channel.nack(msg, false, true);
    }
  });

  // Handle connection events
  conn.on('close', () => {
    console.log(`[${department}] RabbitMQ connection closed`);
  });

  conn.on('error', (err) => {
    console.error(`[${department}] RabbitMQ connection error:`, err);
  });
}

export async function startAllConsumers(): Promise<void> {
  const departments = ['police', 'sanitation', 'health', 'infrastructure', 'general'];

  console.log('Starting consumers for all departments...');

  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Prefetch across all queues
  channel.prefetch(5);

  for (const department of departments) {
    const queue = `reports.${department}`;
    await channel.assertQueue(queue, { durable: true });

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const event: ReportCreatedEvent = JSON.parse(msg.content.toString());

        if (event.eventType === 'REPORT_CREATED') {
          await processReport(department, event);
        }

        channel.ack(msg);
      } catch (error) {
        console.error(`[${department}] Error processing message:`, error);
        channel.nack(msg, false, true);
      }
    });

    console.log(`[${department}] Consumer attached to queue`);
  }

  console.log('All department consumers started');

  conn.on('close', () => {
    console.log('RabbitMQ connection closed');
  });
}
