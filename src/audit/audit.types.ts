export type AuditEventType =
  | 'HTTP_ACCESS'
  | 'HTTP_ERROR'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTHN_DENIED'
  | 'AUTHZ_DENIED';

export interface AuditLogEntry {
  eventType: AuditEventType;
  requestId?: string;
  actorEmail?: string;
  actorRole?: string;
  actorTenantId?: string;
  targetTenantId?: string;
  httpMethod?: string;
  route?: string;
  entity?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  errorName?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
