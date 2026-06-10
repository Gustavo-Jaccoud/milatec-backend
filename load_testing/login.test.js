import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  DEFAULT_HEADERS,
  emailForVu,
  LOGIN_EMAILS,
  PIN_RESEND_COOLDOWN_SEC,
} from './config.js';

const errorRate = new Rate('error_rate');
const requestPinDuration = new Trend('request_pin_duration');

const maxVus = Math.max(1, LOGIN_EMAILS.length);

export const options = {
  scenarios: {
    baseline_request_pin: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: Math.min(maxVus, 3) },
        { duration: '45s', target: maxVus },
        { duration: '45s', target: maxVus },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    request_pin_duration: ['p(95)<500'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const email = emailForVu(__VU);

  if (!email) {
    throw new Error('Defina LOGIN_EMAIL ou LOGIN_EMAILS para executar login.test.js.');
  }

  const res = http.post(
    `${BASE_URL}/auth/request-pin`,
    JSON.stringify({ email }),
    { headers: DEFAULT_HEADERS, tags: { endpoint: 'request_pin' } },
  );

  const ok = check(res, {
    'request-pin status 200': (r) => r.status === 200,
    'request-pin tempo < 500ms': (r) => r.timings.duration < 500,
    'retorna message': (r) => !!r.json('message'),
    'retorna expiresInSeconds': (r) => typeof r.json('expiresInSeconds') === 'number',
  });

  errorRate.add(!ok);
  requestPinDuration.add(res.timings.duration);

  // Respeita cooldown de reenvio (60s) quando ha poucos e-mails cadastrados.
  const cooldown = LOGIN_EMAILS.length <= 1 ? PIN_RESEND_COOLDOWN_SEC : 2;
  sleep(cooldown);
}
