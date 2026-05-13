import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from 'src/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/user-role.enum';
import {
  EMAIL_NOT_REGISTERED_MESSAGE,
  PIN_EXPIRED_MESSAGE,
  PIN_INVALID_MESSAGE,
  RESEND_COOLDOWN_MESSAGE,
} from './auth.constants';

describe('AuthController', () => {
  const activeUser = {
    name: 'Usuario Teste',
    email: 'usuario@milatec.com',
    active: true,
    role: UserRole.USER,
    idEmpresa: 'empresa-1',
  };

  let app: INestApplication;
  let httpServer: App;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let userService: { getUser: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };
    userService = {
      getUser: jest.fn().mockResolvedValue(activeUser),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: UserService, useValue: userService },
        { provide: EmailService, useValue: emailService },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/request-pin', () => {
    it('retorna 200 para usuario ativo', async () => {
      await request(httpServer)
        .post('/auth/request-pin')
        .send({ email: 'usuario@milatec.com' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'PIN enviado para o e-mail.',
            expiresInSeconds: 150,
            resendAvailableInSeconds: 60,
          });
        });
    });

    it('retorna 401 para e-mail inexistente ou inativo', async () => {
      userService.getUser.mockResolvedValue(undefined);

      await request(httpServer)
        .post('/auth/request-pin')
        .send({ email: 'naoexiste@milatec.com' })
        .expect(401)
        .expect((response) => {
          const body = response.body as { message: string };
          expect(body.message).toBe(EMAIL_NOT_REGISTERED_MESSAGE);
        });
    });

    it('retorna 429 durante cooldown', async () => {
      cacheManager.get.mockResolvedValue(true);

      await request(httpServer)
        .post('/auth/request-pin')
        .send({ email: 'usuario@milatec.com' })
        .expect(429)
        .expect((response) => {
          const body = response.body as { message: string };
          expect(body.message).toBe(RESEND_COOLDOWN_MESSAGE);
        });
    });

    it('retorna 500 quando o e-mail nao e enviado', async () => {
      emailService.sendEmail.mockRejectedValue(new Error('smtp offline'));

      await request(httpServer)
        .post('/auth/request-pin')
        .send({ email: 'usuario@milatec.com' })
        .expect(500)
        .expect((response) => {
          const body = response.body as { message: string };
          expect(body.message).toBe('Falha ao enviar PIN por e-mail');
        });
    });
  });

  describe('POST /auth/verify-pin', () => {
    beforeEach(() => {
      cacheManager.get.mockResolvedValue({
        pin: '1234',
        attempts: 0,
        expiresAt: Date.now() + 150000,
      });
    });

    it('retorna accessToken para PIN correto', async () => {
      await request(httpServer)
        .post('/auth/verify-pin')
        .send({ email: 'usuario@milatec.com', pin: '1234' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ accessToken: 'jwt-token' });
        });
    });

    it('valida o contrato do DTO localmente', async () => {
      await request(httpServer)
        .post('/auth/verify-pin')
        .send({ email: 'usuario@milatec.com', pin: '123' })
        .expect(400);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('retorna erro claro para PIN invalido', async () => {
      await request(httpServer)
        .post('/auth/verify-pin')
        .send({ email: 'usuario@milatec.com', pin: '0000' })
        .expect(401)
        .expect((response) => {
          const body = response.body as { message: string };
          expect(body.message).toBe(PIN_INVALID_MESSAGE);
        });
    });

    it('retorna erro claro para PIN expirado', async () => {
      cacheManager.get.mockResolvedValue({
        pin: '1234',
        attempts: 0,
        expiresAt: Date.now() - 1,
      });

      await request(httpServer)
        .post('/auth/verify-pin')
        .send({ email: 'usuario@milatec.com', pin: '1234' })
        .expect(401)
        .expect((response) => {
          const body = response.body as { message: string };
          expect(body.message).toBe(PIN_EXPIRED_MESSAGE);
        });
    });
  });

  describe('POST /auth/login legado', () => {
    it('sem code solicita PIN pela mesma logica nova', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'usuario@milatec.com' })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({
            message: 'PIN enviado para o e-mail.',
            expiresInSeconds: 150,
            resendAvailableInSeconds: 60,
          });
        });
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('com code valida PIN e emite JWT', async () => {
      cacheManager.get.mockResolvedValue({
        pin: '1234',
        attempts: 0,
        expiresAt: Date.now() + 150000,
      });

      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'usuario@milatec.com', code: '1234' })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({ accessToken: 'jwt-token' });
        });
    });
  });
});
