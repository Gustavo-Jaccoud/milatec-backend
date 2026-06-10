import http from 'k6/http';
import {
  AUTH_TOKEN,
  BASE_URL,
  DEFAULT_HEADERS,
  LOGIN_EMAIL,
  LOGIN_PIN,
} from './config.js';

/**
 * Obtem JWT para rotas protegidas.
 * Prioridade: AUTH_TOKEN > fluxo request-pin + verify-pin.
 */
export function obtainAccessToken() {
  if (AUTH_TOKEN) {
    return { token: AUTH_TOKEN };
  }

  if (!LOGIN_EMAIL) {
    throw new Error('Defina AUTH_TOKEN ou LOGIN_EMAIL para autenticar nos testes protegidos.');
  }

  const requestRes = http.post(
    `${BASE_URL}/auth/request-pin`,
    JSON.stringify({ email: LOGIN_EMAIL }),
    { headers: DEFAULT_HEADERS, tags: { endpoint: 'setup_request_pin' } },
  );

  if (requestRes.status !== 200) {
    throw new Error(
      `Falha ao solicitar PIN em /auth/request-pin. Status: ${requestRes.status} body: ${requestRes.body}`,
    );
  }

  if (!LOGIN_PIN) {
    throw new Error(
      'PIN solicitado com sucesso. Defina LOGIN_PIN (4 digitos, ex.: logs [DEV_AUTH_CODE] ou e-mail) e execute novamente.',
    );
  }

  const verifyRes = http.post(
    `${BASE_URL}/auth/verify-pin`,
    JSON.stringify({ email: LOGIN_EMAIL, pin: LOGIN_PIN }),
    { headers: DEFAULT_HEADERS, tags: { endpoint: 'setup_verify_pin' } },
  );

  if (verifyRes.status !== 200 || !verifyRes.json('accessToken')) {
    throw new Error(
      `Falha ao verificar PIN em /auth/verify-pin. Status: ${verifyRes.status} body: ${verifyRes.body}`,
    );
  }

  return { token: verifyRes.json('accessToken') };
}
