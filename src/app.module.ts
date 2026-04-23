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
import strict from 'assert/strict';


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
        transport: {
          host: config.get('MAIL_HOST'),
          port: Number(config.get('MAIL_PORT')),
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          }
        },
        template: {
            dir: join(__dirname, './email/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            }
          }
      }),
    }),
    ProjectModule,

  ],
  controllers: [AppController],
  providers: [EmailService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ]
})
export class AppModule { }
