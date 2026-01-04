import { createHmac } from 'crypto';

export function getAnonReporterHash(userId: string): string {
  const secret = process.env.ANON_REPORT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('ANON_REPORT_SECRET or SESSION_SECRET is required for anonymous reports');
  }

  return createHmac('sha256', secret).update(userId).digest('hex');
}
