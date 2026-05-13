import { createMailTransportOptions } from './mail-transport.config';

describe('createMailTransportOptions', () => {
  const getConfig = (values: Record<string, string | boolean | number>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  it('usa CA padrao do Node junto com a CA do sistema operacional', () => {
    const config = getConfig({
      MAIL_HOST: 'smtp.gmail.com',
      MAIL_PORT: '587',
      MAIL_USER: 'usuario@milatec.com',
      MAIL_PASS: 'senha',
    });

    const transport = createMailTransportOptions(config as any, (type) => {
      if (type === 'default') {
        return ['node-ca', 'shared-ca'];
      }

      if (type === 'system') {
        return ['windows-ca', 'shared-ca'];
      }

      return [];
    });

    expect(transport).toMatchObject({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'usuario@milatec.com',
        pass: 'senha',
      },
      tls: {
        ca: ['node-ca', 'shared-ca', 'windows-ca'],
      },
    });
  });

  it('usa conexao segura automaticamente para SMTP na porta 465', () => {
    const config = getConfig({
      MAIL_HOST: 'smtp.gmail.com',
      MAIL_PORT: '465',
      MAIL_USER: 'usuario@milatec.com',
      MAIL_PASS: 'senha',
    });

    const transport = createMailTransportOptions(config as any, () => []);

    expect(transport.secure).toBe(true);
  });

  it('permite desabilitar CA do sistema e ajustar rejectUnauthorized por ambiente', () => {
    const config = getConfig({
      MAIL_HOST: 'smtp.gmail.com',
      MAIL_PORT: '587',
      MAIL_USER: 'usuario@milatec.com',
      MAIL_PASS: 'senha',
      MAIL_USE_SYSTEM_CA: 'false',
      MAIL_TLS_REJECT_UNAUTHORIZED: 'false',
    });

    const transport = createMailTransportOptions(config as any, () => [
      'unused-ca',
    ]);

    expect(transport.tls).toEqual({
      rejectUnauthorized: false,
    });
  });
});
