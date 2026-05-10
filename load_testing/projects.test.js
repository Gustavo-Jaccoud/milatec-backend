import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  AUTH_TOKEN,
  BASE_URL,
  bearerHeaders,
  DEFAULT_HEADERS,
  LOGIN_CODE,
  LOGIN_EMAIL,
} from './config.js';

const errorRate = new Rate('error_rate');
const projectsDuration = new Trend('projects_duration');

export const options = {
  scenarios: {
    baseline_project_reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '1m', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
    projects_duration: ['p(95)<500'],
  },
};

export function setup() {
  if (AUTH_TOKEN) {
    return { token: AUTH_TOKEN };
  }

  if (!LOGIN_EMAIL) {
    throw new Error('Defina LOGIN_EMAIL para executar projects.test.js sem AUTH_TOKEN.');
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
      'Codigo disparado com sucesso. Defina LOGIN_CODE (obtido pela sua logica) e execute novamente.'
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

export default function (data) {
  const headers = bearerHeaders(data?.token);

  const listRes = http.get(`${BASE_URL}/project`, {
    headers,
    tags: { endpoint: 'projects_list' },
  });

  const listOk = check(listRes, {
    'lista: status 200':  (r) => r.status === 200,
    'lista: tempo < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!listOk);
  projectsDuration.add(listRes.timings.duration);

  sleep(0.7);
}
