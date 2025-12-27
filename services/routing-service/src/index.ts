import { startConsumer, startAllConsumers } from './consumers/reportConsumer';

const DEPARTMENT = process.env.DEPARTMENT;
const CONSUME_ALL = process.env.CONSUME_ALL === 'true';

async function main() {
  console.log('Starting Routing Service...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (CONSUME_ALL) {
    // For PoC demo: single consumer handles all department queues
    console.log('Mode: Consuming ALL department queues');
    await startAllConsumers();
  } else if (DEPARTMENT) {
    // Production mode: one consumer per department
    console.log(`Mode: Consuming single department queue - ${DEPARTMENT}`);
    await startConsumer(DEPARTMENT);
  } else {
    // Default: consume general queue
    console.log('Mode: Consuming general queue (default)');
    await startConsumer('general');
  }

  console.log('Routing Service started successfully');
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

main().catch((error) => {
  console.error('Failed to start Routing Service:', error);
  process.exit(1);
});
