import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailService } from './email/email.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AirtableModule } from './airtable/airtable.module';
import { ConstructionModule } from './construction/construction.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { ProjectModule } from './project/project.module';
import { DeliveryModule } from './delivery/delivery.module';
import { AuditModule } from './audit/audit.module';
import { createMailTransportOptions } from './email/mail-transport.config';

@Module({
  imports: [
    AuthModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule,
    AirtableModule,
    ConstructionModule,
    ProjectModule,
    DeliveryModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    EmailService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
