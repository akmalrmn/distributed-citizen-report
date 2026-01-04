import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { pool } from '../db/connection';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://citizen:citizen123@localhost:5672';
const EXCHANGE = 'reports.exchange';
const QUEUE = 'reports.notifications';

interface ReportStatusChangedPayload {
  eventId: string;
  eventType: 'REPORT_STATUS_CHANGED';
  timestamp: string;
  data: {
    reportId: string;
    oldStatus: string;
    newStatus: string;
    reporterId: string | null;
  };
}

async function handleStatusChanged(event: ReportStatusChangedPayload): Promise<void> {
  const { eventId, data } = event;
  const { reportId, oldStatus, newStatus, reporterId } = data;

  let reporterHash: string | null = null;

  if (!reporterId) {
    const hashResult = await pool.query(
      'SELECT reporter_hash FROM anonymous_reporters WHERE report_id = $1',
      [reportId]
    );
    reporterHash = hashResult.rows[0]?.reporter_hash || null;
  }

  if (!reporterId && !reporterHash) {
    return;
  }

  const message = `Report status changed from ${oldStatus} to ${newStatus}`;

  await pool.query(
    `INSERT INTO notifications (
        event_id,
        user_id,
        reporter_hash,
        report_id,
        notification_type,
        message
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id) DO NOTHING`,
    [eventId, reporterId, reporterHash, reportId, 'status_change', message]
  );
}

async function consumeMessage(channel: Channel, msg: ConsumeMessage | null): Promise<void> {
  if (!msg) return;

  try {
    const payload = JSON.parse(msg.content.toString());

    if (payload?.eventType === 'REPORT_STATUS_CHANGED' && payload.eventId) {
      await handleStatusChanged(payload as ReportStatusChangedPayload);
    }

    channel.ack(msg);
  } catch (error) {
    console.error('Failed to process notification message:', error);
    channel.nack(msg, false, true);
  }
}

export async function startNotificationConsumer(): Promise<void> {
  const conn: ChannelModel = await amqp.connect(RABBITMQ_URL);
  const channel: Channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, 'report.notification.*');

  channel.prefetch(10);

  channel.consume(QUEUE, (msg) => {
    consumeMessage(channel, msg).catch((error) => {
      console.error('Notification consumer error:', error);
    });
  });

  conn.on('close', () => {
    console.log('Notification consumer RabbitMQ connection closed');
  });

  conn.on('error', (err) => {
    console.error('Notification consumer RabbitMQ error:', err);
  });
}
