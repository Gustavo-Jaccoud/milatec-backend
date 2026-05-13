import {
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuditService } from 'src/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/user-role.enum';
import {
  EMAIL_NOT_REGISTERED_MESSAGE,
  PIN_TTL_MS,
  RESEND_COOLDOWN_MS,
  RESEND_COOLDOWN_MESSAGE,
} from './auth.constants';

describe('AuthService.requestPin', () => {
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
  let userService: { getUser: jest.Mock };
  let emailService: { sendEmail: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    userService = {
      getUser: jest.fn().mockResolvedValue(activeUser),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      { signAsync: jest.fn() } as unknown as JwtService,
      cacheManager as any,
      userService as unknown as UserService,
      emailService as unknown as EmailService,
      auditService as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gera PIN numerico de 4 digitos, salva em cache com TTL e envia e-mail', async () => {
    cacheManager.get.mockResolvedValue(undefined);

    const response = await service.requestPin({
      email: ' Usuario@MilaTec.com ',
    });

    expect(response).toEqual({
      message: 'PIN enviado para o e-mail.',
      expiresInSeconds: 150,
      resendAvailableInSeconds: 60,
    });
    expect(userService.getUser).toHaveBeenCalledWith('usuario@milatec.com');

    const [pinKey, pinEntry, pinTtl] = cacheManager.set.mock.calls[0];
    expect(pinKey).toBe('auth:pin:usuario@milatec.com');
    expect(pinEntry.pin).toMatch(/^\d{4}$/);
    expect(pinEntry.attempts).toBe(0);
    expect(pinEntry.expiresAt).toBe(fixedNow.getTime() + PIN_TTL_MS);
    expect(pinTtl).toBe(PIN_TTL_MS);

    expect(cacheManager.set).toHaveBeenCalledWith(
      'auth:pin:cooldown:usuario@milatec.com',
      true,
      RESEND_COOLDOWN_MS,
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'usuario@milatec.com',
      pinEntry.pin,
    );
  });

  it('retorna erro para e-mail inexistente', async () => {
    userService.getUser.mockResolvedValue(undefined);
    const promise = service.requestPin({ email: 'naoexiste@milatec.com' });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promise).rejects.toThrow(EMAIL_NOT_REGISTERED_MESSAGE);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        actorEmail: 'naoexiste@milatec.com',
        route: '/auth/request-pin',
        statusCode: 401,
        errorMessage: EMAIL_NOT_REGISTERED_MESSAGE,
      }),
    );
  });

  it('retorna erro para usuario inativo', async () => {
    userService.getUser.mockResolvedValue({ ...activeUser, active: false });

    await expect(
      service.requestPin({ email: 'usuario@milatec.com' }),
    ).rejects.toThrow(EMAIL_NOT_REGISTERED_MESSAGE);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('bloqueia reenvio durante cooldown', async () => {
    cacheManager.get.mockResolvedValue(true);
    const promise = service.requestPin({ email: 'usuario@milatec.com' });

    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toThrow(RESEND_COOLDOWN_MESSAGE);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('propaga falha de envio de e-mail e remove cache criado', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    emailService.sendEmail.mockRejectedValue(new Error('smtp offline'));

    await expect(
      service.requestPin({ email: 'usuario@milatec.com' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(cacheManager.del).toHaveBeenCalledWith(
      'auth:pin:usuario@milatec.com',
    );
    expect(cacheManager.del).toHaveBeenCalledWith(
      'auth:pin:cooldown:usuario@milatec.com',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH_LOGIN_FAILED',
        route: '/auth/request-pin',
        statusCode: 500,
        errorMessage: 'Falha ao enviar PIN por e-mail',
      }),
    );
  });
});
