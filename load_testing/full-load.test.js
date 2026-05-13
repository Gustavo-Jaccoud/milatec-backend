/**
 * Teste de Sobrecarga Completo — Tarefa 5.0
 * Cobre: login, projetos, listagem geral
 * Thresholds: p95 < 500ms, error_rate < 1%
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import {
  AUTH_TOKEN,
  BASE_URL,
  bearerHeaders,
  DEFAULT_HEADERS,
  ENABLE_AUTH_SCENARIO,
  LOGIN_CODE,
  LOGIN_EMAIL,
} from './config.js';

// ─── Métricas customizadas ────────────────────────────────────────────────────
const errorRate     = new Rate('error_rate');
const loginTrend    = new Trend('duration_login');
const projectsTrend = new Trend('duration_projects');
const totalRequests = new Counter('total_requests');

// ─── Configuração dos cenários ────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Cenário 1: Ramp-up suave
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 50 },
        { duration: '2m',  target: 50 },
        { duration: '30s', target: 0  },
      ],
      gracefulRampDown: '10s',
    },

    // Cenário 2: Pico de carga (spike)
    spike: {
      executor: 'ramping-vus',
      startTime: '4m30s',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 200 }, // pico repentino
        { duration: '30s', target: 200 },
        { duration: '15s', target: 0   },
      ],
      gracefulRampDown: '10s',
    },

    // Cenário 3: Taxa constante de requisições
    constant_rate: {
      executor: 'constant-arrival-rate',
      startTime: '5m30s',
      rate: 30,          // 30 req/s
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },

  thresholds: {
    // Performance geral
    http_req_duration:          ['p(95)<500', 'p(99)<1000'],
    // Por endpoint
    'duration_projects':        ['p(95)<500'],
    // Confiabilidade
    error_rate:                 ['rate<0.01'],
    http_req_failed:            ['rate<0.01'],
    // Throughput
    http_reqs:                  ['rate>10'],
  },
};

if (ENABLE_AUTH_SCENARIO) {
  options.thresholds.duration_login = ['p(95)<400'];
}

// ─── Variáveis de ambiente ────────────────────────────────────────────────────
export function setup() {
  if (AUTH_TOKEN) {
    return { token: AUTH_TOKEN };
  }

  if (!LOGIN_EMAIL) {
    throw new Error('Defina LOGIN_EMAIL para executar o fluxo de login automatizado.');
  }

  const triggerRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL }),
    { headers: DEFAULT_HEADERS, tags: { endpoint: 'setup_login_trigger' } }
  );

  if (triggerRes.status !== 200) {
    throw new Error(`Falha ao disparar codigo de login. Status: ${triggerRes.status}`);
  }

  if (!LOGIN_CODE) {
    throw new Error(
      'Codigo disparado com sucesso. Agora defina LOGIN_CODE (capturado pela sua logica de recebimento) e rode novamente.'
    );
  }

  const tokenRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, code: LOGIN_CODE }),
    { headers: DEFAULT_HEADERS, tags: { endpoint: 'setup_login_exchange' } }
  );

  if (tokenRes.status !== 200 || !tokenRes.json('accessToken')) {
    throw new Error(`Falha ao trocar codigo por token. Status: ${tokenRes.status}`);
  }

  return { token: tokenRes.json('accessToken') };
}

// ─── Função principal ─────────────────────────────────────────────────────────
export default function (data) {
  const token = data?.token;

  const authHeaders = {
    headers: bearerHeaders(token),
  };

  if (ENABLE_AUTH_SCENARIO) {
    group('auth', () => {
      const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
          email: LOGIN_EMAIL || `user${randomIntBetween(1, 500)}@test.com`,
          ...(LOGIN_CODE ? { code: LOGIN_CODE } : {}),
        }),
        { headers: DEFAULT_HEADERS, tags: { endpoint: 'login' } }
      );

      const ok = check(res, {
        '[login] status 200':     (r) => r.status === 200,
        '[login] resposta esperada': (r) => {
          if (LOGIN_CODE) return !!r.json('accessToken');
          return !!r.json('message');
        },
        '[login] tempo < 500ms':  (r) => r.timings.duration < 500,
      });

      errorRate.add(!ok);
      loginTrend.add(res.timings.duration);
      totalRequests.add(1);
    });

    sleep(randomIntBetween(1, 2));
  }

  // ── Grupo 2: Projetos ──────────────────────────────────────────────────────
  group('projects', () => {
    // Listar
    const listRes = http.get(`${BASE_URL}/project`, {
      ...authHeaders,
      tags: { endpoint: 'projects_list' },
    });

    check(listRes, {
      '[projects] list 200':      (r) => r.status === 200,
      '[projects] list < 500ms':  (r) => r.timings.duration < 500,
    });

    projectsTrend.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    totalRequests.add(1);

    sleep(0.3);
  });

  sleep(randomIntBetween(1, 3));
}

// ─── Teardown: resumo ─────────────────────────────────────────────────────────
export function teardown(data) {
  console.log('✅ Testes de sobrecarga finalizados.');
  console.log(`   Token usado: ${data?.token ? 'Sim' : 'Não (anônimo)'}`);
}
