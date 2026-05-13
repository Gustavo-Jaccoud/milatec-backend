import type { ConfigService } from '@nestjs/config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as tls from 'tls';

type ConfigReader = Pick<ConfigService, 'get'>;
type CaStoreType = 'default' | 'system' | 'bundled' | 'extra';
type GetCaCertificates = (type?: CaStoreType) => string[];

const TRUE_VALUES = new Set(['true', '1', 'yes', 'sim']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'nao']);

export const createMailTransportOptions = (
  config: ConfigReader,
  getCaCertificates = getRuntimeCaCertificates(),
): SMTPTransport.Options => {
  const port = getMailPort(config);
  const secure = getMailSecure(config, port);
  const tlsOptions = getMailTlsOptions(config, getCaCertificates);

  return {
    host: config.get<string>('MAIL_HOST'),
    port,
    secure,
    auth: {
      user: config.get<string>('MAIL_USER'),
      pass: config.get<string>('MAIL_PASS'),
    },
    ...(tlsOptions ? { tls: tlsOptions } : {}),
  };
};

const getMailPort = (config: ConfigReader): number => {
  const port = Number(config.get<string | number>('MAIL_PORT') ?? 587);
  return Number.isFinite(port) ? port : 587;
};

const getMailSecure = (config: ConfigReader, port: number): boolean => {
  const configuredSecure = parseBoolean(
    config.get<string | boolean>('MAIL_SECURE'),
  );
  return configuredSecure ?? port === 465;
};

const getMailTlsOptions = (
  config: ConfigReader,
  getCaCertificates?: GetCaCertificates,
): tls.ConnectionOptions | undefined => {
  const rejectUnauthorized = parseBoolean(
    config.get<string | boolean>('MAIL_TLS_REJECT_UNAUTHORIZED'),
  );
  const useSystemCa =
    parseBoolean(config.get<string | boolean>('MAIL_USE_SYSTEM_CA')) ?? true;
  const tlsOptions: tls.ConnectionOptions = {};

  if (useSystemCa && getCaCertificates) {
    const certificates = mergeCertificates(
      getCaCertificates('default'),
      getCaCertificates('system'),
    );

    if (certificates.length > 0) {
      tlsOptions.ca = certificates;
    }
  }

  if (rejectUnauthorized !== undefined) {
    tlsOptions.rejectUnauthorized = rejectUnauthorized;
  }

  return Object.keys(tlsOptions).length > 0 ? tlsOptions : undefined;
};

const getRuntimeCaCertificates = (): GetCaCertificates | undefined => {
  const getCaCertificates = (tls as { getCACertificates?: GetCaCertificates })
    .getCACertificates;

  return typeof getCaCertificates === 'function'
    ? getCaCertificates.bind(tls)
    : undefined;
};

const mergeCertificates = (...certificateGroups: string[][]): string[] => {
  return Array.from(new Set(certificateGroups.flat()));
};

const parseBoolean = (value?: string | boolean): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (TRUE_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSE_VALUES.has(normalizedValue)) {
    return false;
  }

  return undefined;
};
