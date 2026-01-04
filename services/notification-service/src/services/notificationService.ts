import { pool } from '../db/connection';
import { getAnonReporterHash } from '../utils/anon';

export interface Notification {
  id: string;
  report_id: string | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export async function getNotificationsForUser(
  userId: string,
  options?: { status?: 'all' | 'unread'; limit?: number }
): Promise<{ data: Notification[]; unreadCount: number }> {
  const reporterHash = getAnonReporterHash(userId);
  const limit = options?.limit ?? 20;

  let whereClause = '(user_id = $1 OR reporter_hash = $2)';
  const params: Array<string | number | boolean> = [userId, reporterHash];

  if (options?.status === 'unread') {
    params.push(false);
    whereClause += ` AND is_read = $${params.length}`;
  }

  params.push(limit);

  const [dataResult, unreadResult] = await Promise.all([
    pool.query(
      `SELECT id, report_id, notification_type, message, is_read, created_at
       FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int as count
       FROM notifications
       WHERE (user_id = $1 OR reporter_hash = $2) AND is_read = false`,
      [userId, reporterHash]
    )
  ]);

  return {
    data: dataResult.rows,
    unreadCount: unreadResult.rows[0]?.count || 0
  };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const reporterHash = getAnonReporterHash(userId);
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND (user_id = $2 OR reporter_hash = $3)`,
    [notificationId, userId, reporterHash]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const reporterHash = getAnonReporterHash(userId);
  await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE (user_id = $1 OR reporter_hash = $2) AND is_read = false`,
    [userId, reporterHash]
  );
}
