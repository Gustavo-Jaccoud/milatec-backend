/**
 * Teste de Sobrecarga Completo — Tarefa 5.0
 * Cobre: request-pin (opcional), projetos, construction, delivery
 * Thresholds: p95 < 500ms, error_rate < 1%
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { obtainAccessToken } from './auth-setup.js';
import {
  BASE_URL,
  bearerHeaders,
  DEFAULT_HEADERS,
  ENABLE_AUTH_SCENARIO,
  emailForVu,
  PIN_RESEND_COOLDOWN_SEC,
} from './config.js';

const errorRate = new Rate('error_rate');
const requestPinTrend = new Trend('duration_request_pin');
const projectsTrend = new Trend('duration_projects');
const constructionTrend = new Trend('duration_construction');
const deliveryTrend = new Trend('duration_delivery');
const totalRequests = new Counter('total_requests');

export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },

    spike: {
      executor: 'ramping-vus',
      startTime: '4m30s',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },

    constant_rate: {
      executor: 'constant-arrival-rate',
      startTime: '5m30s',
      rate: 30,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    duration_projects: ['p(95)<500'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>10'],
  },
};

if (ENABLE_AUTH_SCENARIO) {
  options.thresholds.duration_request_pin = ['p(95)<400'];
}

export function setup() {
  return obtainAccessToken();
}

export default function (data) {
  const token = data?.token;
  const authHeaders = { headers: bearerHeaders(token) };

  if (ENABLE_AUTH_SCENARIO) {
    group('auth', () => {
      const email = emailForVu(__VU);
      if (!email) {
        return;
      }

      const res = http.post(
        `${BASE_URL}/auth/request-pin`,
        JSON.stringify({ email }),
        { headers: DEFAULT_HEADERS, tags: { endpoint: 'request_pin' } },
      );

      const ok = check(res, {
        '[request-pin] status 200': (r) => r.status === 200,
        '[request-pin] retorna message': (r) => !!r.json('message'),
        '[request-pin] tempo < 500ms': (r) => r.timings.duration < 500,
      });

      errorRate.add(!ok);
      requestPinTrend.add(res.timings.duration);
      totalRequests.add(1);
    });

    sleep(PIN_RESEND_COOLDOWN_SEC);
  }

  group('projects', () => {
    const listRes = http.get(`${BASE_URL}/project`, {
      ...authHeaders,
      tags: { endpoint: 'projects_list' },
    });

    check(listRes, {
      '[projects] list 200': (r) => r.status === 200,
      '[projects] list < 500ms': (r) => r.timings.duration < 500,
    });

    projectsTrend.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    totalRequests.add(1);
  });

  group('construction', () => {
    const listRes = http.get(`${BASE_URL}/construction`, {
      ...authHeaders,
      tags: { endpoint: 'construction_list' },
    });

    check(listRes, {
      '[construction] list 200': (r) => r.status === 200,
      '[construction] list < 500ms': (r) => r.timings.duration < 500,
    });

    constructionTrend.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    totalRequests.add(1);
  });

  group('delivery', () => {
    const listRes = http.get(`${BASE_URL}/delivery`, {
      ...authHeaders,
      tags: { endpoint: 'delivery_list' },
    });

    check(listRes, {
      '[delivery] list 200': (r) => r.status === 200,
      '[delivery] list < 500ms': (r) => r.timings.duration < 500,
    });

    deliveryTrend.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    totalRequests.add(1);
  });

  sleep(randomIntBetween(1, 3));
}

export function teardown(data) {
  console.log('Testes de sobrecarga finalizados.');
  console.log(`Token usado: ${data?.token ? 'Sim' : 'Nao'}`);
}
