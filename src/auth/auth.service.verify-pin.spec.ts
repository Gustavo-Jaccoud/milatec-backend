import {
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'src/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/user-role.enum';
import {
  EMAIL_NOT_REGISTERED_MESSAGE,
  MAX_PIN_ATTEMPTS,
  PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
  PIN_EXPIRED_MESSAGE,
  PIN_INVALID_MESSAGE,
  PIN_TTL_MS,
  TOKEN_ISSUE_FAILURE_MESSAGE,
} from './auth.constants';
import { AuthService } from './auth.service';

describe('AuthService.verifyPin', () => {
  const fixedNow = new Date('2026-05-06T12:00:00.000Z');
  const activeUser = {
    name: 'Usuario Teste',
    email: 'usuario@milatec.com',
    active: true,
    role: UserRole.USER,
    idEmpresa: 'empresa-1',
  };

  let service: AuthService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let userService: { getUser: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);

    cacheManager = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };
    userService = {
      getUser: jest.fn().mockResolvedValue(activeUser),
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      jwtService as unknown as JwtService,
      cacheManager as unknown as Cache,
      userService as unknown as UserService,
      { sendEmail: jest.fn() } as unknown as EmailService,
      auditService as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emite JWT, registra sucesso e limpa PIN e cooldown para PIN correto', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: 0,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });

    const response = await service.verifyPin({
      email: ' Usuario@MilaTec.com ',
      pin: '1234',
    });

    expect(response).toEqual({ accessToken: 'jwt-token' });
    expect(userService.getUser).toHaveBeenCalledWith('usuario@milatec.com');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      name: activeUser.name,
      email: activeUser.email,
      role: activeUser.role,
      idEmpresa: activeUser.idEmpresa,
    });
    expect(cacheManager.del).toHaveBeenCalledWith(
      'auth:pin:usuario@milatec.com',
    );
    expect(cacheManager.del).toHaveBeenCalledWith(
      'auth:pin:cooldown:usuario@milatec.com',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_SUCCESS',
        actorEmail: activeUser.email,
        route: '/auth/verify-pin',
        statusCode: 200,
      }),
    );
  });

  it('rejeita e-mail inexistente ou inativo sem emitir JWT', async () => {
    userService.getUser.mockResolvedValue(undefined);

    await expect(
      service.verifyPin({ email: 'naoexiste@milatec.com', pin: '1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.verifyPin({ email: 'naoexiste@milatec.com', pin: '1234' }),
    ).rejects.toThrow(EMAIL_NOT_REGISTERED_MESSAGE);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        actorEmail: 'naoexiste@milatec.com',
        route: '/auth/verify-pin',
        statusCode: 401,
        errorMessage: EMAIL_NOT_REGISTERED_MESSAGE,
      }),
    );
  });

  it('rejeita PIN ausente ou expirado e remove o cache do PIN', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: 0,
      expiresAt: fixedNow.getTime() - 1,
    });

    await expect(
      service.verifyPin({ email: 'usuario@milatec.com', pin: '1234' }),
    ).rejects.toThrow(PIN_EXPIRED_MESSAGE);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(cacheManager.del).toHaveBeenCalledWith(
      'auth:pin:usuario@milatec.com',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        route: '/auth/verify-pin',
        statusCode: 401,
        errorMessage: PIN_EXPIRED_MESSAGE,
      }),
    );
  });

  it('incrementa tentativa e rejeita PIN invalido antes da terceira tentativa', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: 0,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });

    await expect(
      service.verifyPin({ email: 'usuario@milatec.com', pin: '0000' }),
    ).rejects.toThrow(PIN_INVALID_MESSAGE);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledWith(
      'auth:pin:usuario@milatec.com',
      {
        pin: '1234',
        attempts: 1,
        expiresAt: fixedNow.getTime() + PIN_TTL_MS,
      },
      PIN_TTL_MS,
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        route: '/auth/verify-pin',
        statusCode: 401,
        errorMessage: PIN_INVALID_MESSAGE,
      }),
    );
  });

  it('bloqueia a solicitacao na terceira tentativa invalida', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: MAX_PIN_ATTEMPTS - 1,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });

    const promise = service.verifyPin({
      email: 'usuario@milatec.com',
      pin: '0000',
    });

    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toThrow(PIN_ATTEMPTS_EXHAUSTED_MESSAGE);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledWith(
      'auth:pin:usuario@milatec.com',
      {
        pin: '1234',
        attempts: MAX_PIN_ATTEMPTS,
        expiresAt: fixedNow.getTime() + PIN_TTL_MS,
      },
      PIN_TTL_MS,
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        route: '/auth/verify-pin',
        statusCode: 429,
        errorMessage: PIN_ATTEMPTS_EXHAUSTED_MESSAGE,
      }),
    );
  });

  it('mantem bloqueio para solicitacao ja esgotada', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: MAX_PIN_ATTEMPTS,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });

    await expect(
      service.verifyPin({ email: 'usuario@milatec.com', pin: '1234' }),
    ).rejects.toThrow(PIN_ATTEMPTS_EXHAUSTED_MESSAGE);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('registra falha quando o JWT nao pode ser emitido', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: 0,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });
    jwtService.signAsync.mockRejectedValue(new Error('jwt offline'));

    await expect(
      service.verifyPin({ email: 'usuario@milatec.com', pin: '1234' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(
      service.verifyPin({ email: 'usuario@milatec.com', pin: '1234' }),
    ).rejects.toThrow(TOKEN_ISSUE_FAILURE_MESSAGE);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        route: '/auth/verify-pin',
        statusCode: 500,
        errorMessage: TOKEN_ISSUE_FAILURE_MESSAGE,
      }),
    );
  });

  it('usa a rota /auth/login ao validar codigo pelo endpoint legado', async () => {
    cacheManager.get.mockResolvedValue({
      pin: '1234',
      attempts: 0,
      expiresAt: fixedNow.getTime() + PIN_TTL_MS,
    });

    await service.login({ email: 'usuario@milatec.com', code: '1234' });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_SUCCESS',
        route: '/auth/login',
        statusCode: 200,
      }),
    );
  });
});
