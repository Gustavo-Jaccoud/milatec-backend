import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { obtainAccessToken } from './auth-setup.js';
import { BASE_URL, bearerHeaders } from './config.js';

const errorRate = new Rate('error_rate');
const deliveryDuration = new Trend('delivery_duration');

export const options = {
  scenarios: {
    baseline_delivery_reads: {
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
    delivery_duration: ['p(95)<500'],
  },
};

export function setup() {
  return obtainAccessToken();
}

export default function (data) {
  const headers = bearerHeaders(data?.token);

  const listRes = http.get(`${BASE_URL}/delivery`, {
    headers,
    tags: { endpoint: 'delivery_list' },
  });

  const listOk = check(listRes, {
    'lista: status 200': (r) => r.status === 200,
    'lista: tempo < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!listOk);
  deliveryDuration.add(listRes.timings.duration);

  sleep(0.7);
}
