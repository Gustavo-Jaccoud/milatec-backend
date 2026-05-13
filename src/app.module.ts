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
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
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
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: createMailTransportOptions(config),
        template: {
          dir: join(__dirname, './email/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
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
