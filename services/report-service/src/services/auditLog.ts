import { pool } from '../db/connection';

export interface AuditLogEntry {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const {
    actorId,
    action,
    targetType,
    targetId,
    ipAddress,
    userAgent,
    metadata
  } = entry;

  await pool.query(
    `INSERT INTO audit_logs (
      actor_id,
      action,
      target_type,
      target_id,
      ip_address,
      user_agent,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      actorId || null,
      action,
      targetType || null,
      targetId || null,
      ipAddress || null,
      userAgent || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}
