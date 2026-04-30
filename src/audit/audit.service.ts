import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { sanitizeValue } from './audit.sanitizer';
import { AuditLogEntry } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const metadata = (sanitizeValue(entry.metadata ?? {}) ?? {}) as Record<
      string,
      unknown
    >;
    const errorMessage =
      typeof entry.errorMessage === 'string'
        ? String(sanitizeValue(entry.errorMessage))
        : undefined;

    await this.auditRepository.insert({
      ...entry,
      errorMessage,
      metadata,
    });
  }
}
