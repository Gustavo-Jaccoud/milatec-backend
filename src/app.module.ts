import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailService } from './email/email.service';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [AuthModule, UserModule,ConfigModule.forRoot({
      isGlobal: true,
    })],
  controllers: [AppController],
  providers: [EmailService],
})
export class AppModule {}
