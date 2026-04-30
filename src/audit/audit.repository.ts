import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { AuditLogEntry } from './audit.types';

@Injectable()
export class AuditRepository implements OnModuleDestroy {
  private readonly logger = new Logger(AuditRepository.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const host = this.getConfig('AUDIT_DB_HOST', 'localhost');
    const port = Number(this.getConfig('AUDIT_DB_PORT', '55433'));
    const database = this.getConfig('AUDIT_DB_NAME', 'audit_db');
    const user = this.getConfig('AUDIT_DB_USER', 'audit_user');
    const password = this.getConfig('AUDIT_DB_PASSWORD', 'audit_password');
    const sslEnabled = this.getConfig('AUDIT_DB_SSL', 'false') === 'true';

    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    });
  }

  private getConfig(key: string, fallback: string): string {
    const value = this.configService.get<string>(key);
    if (!value || value.trim().length === 0) {
      return fallback;
    }

    return value.trim();
  }

  async insert(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        event_type,
        request_id,
        actor_email,
        actor_role,
        actor_tenant_id,
        target_tenant_id,
        http_method,
        route,
        entity,
        status_code,
        duration_ms,
        ip,
        user_agent,
        error_name,
        error_message,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
    `;

    const values = [
      entry.eventType,
      entry.requestId ?? null,
      entry.actorEmail ?? null,
      entry.actorRole ?? null,
      entry.actorTenantId ?? null,
      entry.targetTenantId ?? null,
      entry.httpMethod ?? null,
      entry.route ?? null,
      entry.entity ?? null,
      entry.statusCode ?? null,
      entry.durationMs ?? null,
      entry.ip ?? null,
      entry.userAgent ?? null,
      entry.errorName ?? null,
      entry.errorMessage ?? null,
      JSON.stringify(entry.metadata ?? {}),
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      this.logger.error('Falha ao inserir auditoria no Postgres', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
