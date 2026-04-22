import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { configs } from './config/auth.config';
import { ConfigService } from '@nestjs/config';
import { AirtableModule } from 'src/airtable/airtable.module';

console.log('JWT_SECRET:', configs.secret);
@Module({
  imports:[CacheModule.register(),JwtModule.registerAsync({
  imports: [],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: 600 }, 
  }),
}),AirtableModule],
  providers: [AuthService, EmailService, UserService],
  controllers: [AuthController],
  exports: [JwtModule]
})
export class AuthModule {}
