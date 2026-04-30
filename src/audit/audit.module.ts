import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
