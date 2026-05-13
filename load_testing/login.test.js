import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, DEFAULT_HEADERS, LOGIN_CODE, LOGIN_EMAIL } from './config.js';

const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration');

export const options = {
  scenarios: {
    baseline_login: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 15 },
        { duration: '40s', target: 15 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    login_duration: ['p(95)<500'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    email: LOGIN_EMAIL,
    ...(LOGIN_CODE ? { code: LOGIN_CODE } : {}),
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: DEFAULT_HEADERS,
    tags: { endpoint: 'login' },
  });

  const statusOk = check(res, {
    'login status 200': (r) => r.status === 200,
    'login tempo < 500ms': (r) => r.timings.duration < 500,
  });

  let contractOk = false;
  if (LOGIN_CODE) {
    contractOk = check(res, {
      'retorna accessToken com code': (r) => !!r.json('accessToken'),
    });
  } else {
    contractOk = check(res, {
      'retorna message sem code': (r) => !!r.json('message'),
    });
  }

  errorRate.add(!(statusOk && contractOk));
  loginDuration.add(res.timings.duration);

  sleep(1);
}
