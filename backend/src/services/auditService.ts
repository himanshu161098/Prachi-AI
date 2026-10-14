import { db } from '../database';

export interface AuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  status?: 'success' | 'failure' | 'warning';
}

export class AuditService {
  static log(params: AuditLogParams): void {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      // Scrub potential secrets from details
      const scrubbedDetails = { ...params.details };
      const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'apiKey'];
      
      for (const key of Object.keys(scrubbedDetails)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
          scrubbedDetails[key] = '[REDACTED]';
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, resource, details_json, ip_address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        params.userId || null,
        params.action,
        params.resource,
        JSON.stringify(scrubbedDetails),
        params.ipAddress || '127.0.0.1',
        params.status || 'success'
      );
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  static getLogs(userId?: string, limit = 50, offset = 0) {
    if (userId) {
      return db.prepare(`
        SELECT * FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset);
    }
    return db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }
}
