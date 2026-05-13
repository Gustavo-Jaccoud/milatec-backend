import {
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'src/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import { User } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import {
  EMAIL_NOT_REGISTERED_MESSAGE,
  EMAIL_SEND_FAILURE_MESSAGE,
  MAX_PIN_ATTEMPTS,
  PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
  PIN_EXPIRED_MESSAGE,
  PIN_INVALID_MESSAGE,
  PIN_LENGTH,
  PIN_SENT_MESSAGE,
  PIN_TTL_MS,
  RESEND_COOLDOWN_MESSAGE,
  RESEND_COOLDOWN_MS,
  TOKEN_ISSUE_FAILURE_MESSAGE,
} from './auth.constants';
import { LoginDto } from './dtos/login.dto';
import { RequestPinDto } from './dtos/request-pin.dto';
import { VerifyPinDto } from './dtos/verify-pin.dto';

type PinCacheEntry = {
  pin: string;
  attempts: number;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private userService: UserService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  async requestPin(requestPinDto: RequestPinDto, route = '/auth/request-pin') {
    const email = this.normalizeEmail(requestPinDto.email);
    const userExists = await this.userService.getUser(email);

    if (!userExists || !userExists.active) {
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 401,
        errorMessage: EMAIL_NOT_REGISTERED_MESSAGE,
      });
      throw new UnauthorizedException(EMAIL_NOT_REGISTERED_MESSAGE);
    }

    const cooldownKey = this.getPinCooldownCacheKey(email);
    const isInCooldown = await this.cacheManager.get<boolean>(cooldownKey);

    if (isInCooldown) {
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 429,
        errorMessage: RESEND_COOLDOWN_MESSAGE,
      });
      throw new HttpException(
        RESEND_COOLDOWN_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const pin = this.generatePin();
    const pinKey = this.getPinCacheKey(email);
    const pinEntry: PinCacheEntry = {
      pin,
      attempts: 0,
      expiresAt: Date.now() + PIN_TTL_MS,
    };

    await this.cacheManager.set(pinKey, pinEntry, PIN_TTL_MS);
    await this.cacheManager.set(cooldownKey, true, RESEND_COOLDOWN_MS);

    try {
      await this.emailService.sendEmail(email, pin);
    } catch (error) {
      await this.cacheManager.del(pinKey);
      await this.cacheManager.del(cooldownKey);
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 500,
        errorName: (error as Error)?.name,
        errorMessage: EMAIL_SEND_FAILURE_MESSAGE,
      });
      throw new InternalServerErrorException(EMAIL_SEND_FAILURE_MESSAGE);
    }

    return {
      message: PIN_SENT_MESSAGE,
      expiresInSeconds: PIN_TTL_MS / 1000,
      resendAvailableInSeconds: RESEND_COOLDOWN_MS / 1000,
    };
  }

  async verifyPin(verifyPinDto: VerifyPinDto, route = '/auth/verify-pin') {
    const email = this.normalizeEmail(verifyPinDto.email);
    const userExists = await this.userService.getUser(email);

    if (!userExists || !userExists.active) {
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 401,
        errorMessage: EMAIL_NOT_REGISTERED_MESSAGE,
      });
      throw new UnauthorizedException(EMAIL_NOT_REGISTERED_MESSAGE);
    }

    const pinKey = this.getPinCacheKey(email);
    const pinEntry = await this.cacheManager.get<PinCacheEntry>(pinKey);

    if (!pinEntry || pinEntry.expiresAt <= Date.now()) {
      await this.cacheManager.del(pinKey);
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 401,
        errorMessage: PIN_EXPIRED_MESSAGE,
      });
      throw new UnauthorizedException(PIN_EXPIRED_MESSAGE);
    }

    if (pinEntry.attempts >= MAX_PIN_ATTEMPTS) {
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 429,
        errorMessage: PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
      });
      throw new HttpException(
        PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (pinEntry.pin !== verifyPinDto.pin) {
      await this.handleInvalidPinAttempt({
        email,
        user: userExists,
        route,
        pinKey,
        pinEntry,
      });
    }

    let accessToken: string;

    try {
      accessToken = await this.generateToken(userExists);
    } catch (error) {
      await this.logAuthFailure({
        email,
        user: userExists,
        route,
        statusCode: 500,
        errorName: (error as Error)?.name,
        errorMessage: TOKEN_ISSUE_FAILURE_MESSAGE,
      });
      throw new InternalServerErrorException(TOKEN_ISSUE_FAILURE_MESSAGE);
    }

    await this.cacheManager.del(pinKey);
    await this.cacheManager.del(this.getPinCooldownCacheKey(email));

    await this.auditService.log({
      eventType: 'AUTH_LOGIN_SUCCESS',
      actorEmail: userExists.email,
      actorRole: userExists.role,
      actorTenantId: userExists.idEmpresa,
      httpMethod: 'POST',
      route,
      entity: 'auth',
      statusCode: 200,
    });

    return { accessToken };
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.code) {
      return await this.requestPin({ email: loginDto.email }, '/auth/login');
    }

    return await this.verifyPin(
      { email: loginDto.email, pin: loginDto.code },
      '/auth/login',
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getPinCacheKey(email: string): string {
    return `auth:pin:${email}`;
  }

  private getPinCooldownCacheKey(email: string): string {
    return `auth:pin:cooldown:${email}`;
  }

  private generatePin(): string {
    return Array.from({ length: PIN_LENGTH }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
  }

  private async generateToken(user: User): Promise<string> {
    const accessToken = await this.jwtService.signAsync({
      name: user.name,
      email: user.email,
      role: user.role,
      idEmpresa: user.idEmpresa,
    });
    return accessToken;
  }

  private async handleInvalidPinAttempt({
    email,
    user,
    route,
    pinKey,
    pinEntry,
  }: {
    email: string;
    user: User;
    route: string;
    pinKey: string;
    pinEntry: PinCacheEntry;
  }): Promise<never> {
    const attempts = pinEntry.attempts + 1;
    const nextEntry = { ...pinEntry, attempts };
    const remainingTtl = this.getRemainingPinTtl(pinEntry);

    await this.cacheManager.set(pinKey, nextEntry, remainingTtl);

    if (attempts >= MAX_PIN_ATTEMPTS) {
      await this.logAuthFailure({
        email,
        user,
        route,
        statusCode: 429,
        errorMessage: PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
      });
      throw new HttpException(
        PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.logAuthFailure({
      email,
      user,
      route,
      statusCode: 401,
      errorMessage: PIN_INVALID_MESSAGE,
    });
    throw new UnauthorizedException(PIN_INVALID_MESSAGE);
  }

  private getRemainingPinTtl(pinEntry: PinCacheEntry): number {
    return Math.max(pinEntry.expiresAt - Date.now(), 1);
  }

  private async logAuthFailure({
    email,
    user,
    route,
    statusCode,
    errorName,
    errorMessage,
  }: {
    email: string;
    user?: User;
    route: string;
    statusCode: number;
    errorName?: string;
    errorMessage: string;
  }) {
    await this.auditService.log({
      eventType: 'AUTH_LOGIN_FAILED',
      actorEmail: email,
      actorRole: user?.role,
      actorTenantId: user?.idEmpresa,
      httpMethod: 'POST',
      route,
      entity: 'auth',
      statusCode,
      errorName,
      errorMessage,
    });
  }
}
