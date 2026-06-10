export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
export const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || '';
/** PIN de 4 digitos; LOGIN_CODE mantido como alias legado. */
export const LOGIN_PIN = __ENV.LOGIN_PIN || __ENV.LOGIN_CODE || '';
export const LOGIN_CODE = LOGIN_PIN;
export const ENABLE_AUTH_SCENARIO = (__ENV.ENABLE_AUTH_SCENARIO || 'false') === 'true';

/** Lista opcional de e-mails cadastrados (separados por virgula) para testes de request-pin. */
export const LOGIN_EMAILS = (__ENV.LOGIN_EMAILS || LOGIN_EMAIL || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/** Cooldown do backend entre reenvios de PIN (RESEND_COOLDOWN_MS = 60s). */
export const PIN_RESEND_COOLDOWN_SEC = Number(__ENV.PIN_RESEND_COOLDOWN_SEC || 65);

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export function bearerHeaders(token) {
  return {
    ...DEFAULT_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function emailForVu(vu) {
  if (!LOGIN_EMAILS.length) {
    return '';
  }
  return LOGIN_EMAILS[(vu - 1) % LOGIN_EMAILS.length];
}
