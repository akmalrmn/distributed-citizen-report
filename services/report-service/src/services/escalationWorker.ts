import { pool } from '../db/connection';
import { updateReportStatus } from './reportService';

const OPEN_STATUSES = ['submitted', 'routed'];

async function findStaleReports(hours: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT r.id
     FROM reports r
     LEFT JOIN LATERAL (
       SELECT created_at
       FROM report_status_history h
       WHERE h.report_id = r.id
       ORDER BY created_at DESC
       LIMIT 1
     ) last_status ON true
     WHERE r.status = ANY($1::report_status[])
       AND COALESCE(last_status.created_at, r.created_at) < NOW() - ($2 || ' hours')::interval`,
    [OPEN_STATUSES, hours.toString()]
  );

  return result.rows.map((row) => row.id as string);
}

export async function runEscalationCycle(hours: number): Promise<number> {
  const staleReports = await findStaleReports(hours);

  if (staleReports.length === 0) {
    return 0;
  }

  let escalatedCount = 0;
  for (const reportId of staleReports) {
    const updated = await updateReportStatus(
      reportId,
      'escalated',
      undefined,
      `Auto-escalated after ${hours} hours without status update`
    );
    if (updated) {
      escalatedCount += 1;
    }
  }

  return escalatedCount;
}

export function startEscalationWorker(): void {
  const hours = Math.max(parseInt(process.env.ESCALATION_HOURS || '24', 10), 1);
  const intervalMs = Math.max(parseInt(process.env.ESCALATION_INTERVAL_MS || '600000', 10), 60000);

  const run = async () => {
    try {
      const count = await runEscalationCycle(hours);
      if (count > 0) {
        console.log(`Auto-escalated ${count} reports`);
      }
    } catch (error) {
      console.error('Failed to run escalation cycle:', error);
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
}
