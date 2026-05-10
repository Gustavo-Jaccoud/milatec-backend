export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
export const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || '';
export const LOGIN_CODE = __ENV.LOGIN_CODE || '';
export const ENABLE_AUTH_SCENARIO = (__ENV.ENABLE_AUTH_SCENARIO || 'false') === 'true';

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export function bearerHeaders(token) {
  return {
    ...DEFAULT_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
