import amqp, { Channel, ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';

let connection: ChannelModel;
let channel: Channel;
const EXCHANGE = 'reports.exchange';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://citizen:citizen123@localhost:5672';

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Create topic exchange for routing
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Create queues for each department
    const departments = ['police', 'sanitation', 'health', 'infrastructure', 'general'];
    for (const dept of departments) {
      await channel.assertQueue(`reports.${dept}`, { durable: true });
      await channel.bindQueue(`reports.${dept}`, EXCHANGE, `report.${dept}`);
    }

    // Create notification queue
    await channel.assertQueue('reports.notifications', { durable: true });
    await channel.bindQueue('reports.notifications', EXCHANGE, 'report.notification.*');

    console.log('RabbitMQ connected and exchanges/queues configured');

    // Handle connection close
    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    await channel?.close();
    await connection?.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

interface ReportCreatedEvent {
  reportId: string;
  category: string;
  title: string;
  description: string;
  visibility: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface ReportStatusChangedEvent {
  reportId: string;
  oldStatus: string;
  newStatus: string;
  reporterId: string | null;
}

function mapCategoryToRouting(category: string): string {
  const mapping: Record<string, string> = {
    crime: 'report.police',
    cleanliness: 'report.sanitation',
    health: 'report.health',
    infrastructure: 'report.infrastructure',
    other: 'report.general'
  };
  return mapping[category] || 'report.general';
}

export async function publishReportCreated(data: ReportCreatedEvent): Promise<void> {
  if (!channel) {
    console.warn('RabbitMQ channel not available, skipping publish');
    return;
  }

  const routingKey = mapCategoryToRouting(data.category);

  const message = {
    eventType: 'REPORT_CREATED',
    timestamp: new Date().toISOString(),
    data
  };

  channel.publish(
    EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );

  console.log(`Published REPORT_CREATED event to ${routingKey}:`, data.reportId);
}

export async function publishReportStatusChanged(data: ReportStatusChangedEvent): Promise<void> {
  if (!channel) {
    console.warn('RabbitMQ channel not available, skipping publish');
    return;
  }

  const eventId = randomUUID();
  const message = {
    eventId,
    eventType: 'REPORT_STATUS_CHANGED',
    timestamp: new Date().toISOString(),
    data
  };

  // Publish to notification queue
  channel.publish(
    EXCHANGE,
    'report.notification.status',
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );

  console.log(`Published REPORT_STATUS_CHANGED event:`, data.reportId, data.oldStatus, '->', data.newStatus);
}
