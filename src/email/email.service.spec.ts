import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let mailerService: { sendMail: jest.Mock };
  let service: EmailService;

  beforeEach(() => {
    mailerService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    service = new EmailService(mailerService as unknown as MailerService);
  });

  it('envia o template de codigo com o PIN informado', async () => {
    await service.sendEmail('usuario@milatec.com', '1234');

    expect(mailerService.sendMail).toHaveBeenCalledWith({
      to: 'usuario@milatec.com',
      subject: 'Codigo de Confirmacao MilaTec',
      template: 'CodeEmailTemplate',
      context: {
        code: '1234',
      },
    });
  });

  it('propaga falha real do provider de e-mail', async () => {
    const error = new Error('smtp offline');
    mailerService.sendMail.mockRejectedValue(error);

    await expect(service.sendEmail('usuario@milatec.com', '1234')).rejects.toBe(
      error,
    );
  });

  it('usa entrega em console apenas quando explicitamente habilitada fora de producao', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MAIL_DELIVERY_MODE: 'console',
          NODE_ENV: 'development',
        };
        return values[key];
      }),
    };
    service = new EmailService(
      mailerService as unknown as MailerService,
      configService as any,
    );

    await service.sendEmail('usuario@milatec.com', '1234');

    expect(mailerService.sendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'MAIL_DELIVERY_MODE=console ativo; PIN de desenvolvimento para usuario@milatec.com: 1234',
    );
    warnSpy.mockRestore();
  });

  it('ignora entrega em console quando NODE_ENV e production', async () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MAIL_DELIVERY_MODE: 'console',
          NODE_ENV: 'production',
        };
        return values[key];
      }),
    };
    service = new EmailService(
      mailerService as unknown as MailerService,
      configService as any,
    );

    await service.sendEmail('usuario@milatec.com', '1234');

    expect(mailerService.sendMail).toHaveBeenCalled();
  });
});
