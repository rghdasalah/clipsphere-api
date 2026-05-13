// Stress test: trending feed cache hit rate + latency under ramping load.
//
// Usage:
//   docker run --rm -i --network host \
//     -e BASE_URL=https://clipsphere.local \
//     -v "$PWD/stress:/stress" grafana/k6 run /stress/k6/trending.js
//
// Acceptance:
//   * http_req_failed < 1 %
//   * p(95) < 300 ms once cache is warm
//   * cache_hit_rate > 0.95 across the run
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const cacheHits = new Rate('cache_hits');

export const options = {
  scenarios: {
    feed: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 200 },
        { duration: '30s', target: 0   },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
    cache_hits: ['rate>0.95'],
  },
  insecureSkipTLSVerify: true,
};

const BASE = __ENV.BASE_URL || 'https://clipsphere.local';

export default function () {
  const res = http.get(
    `${BASE}/api/v1/videos/trending?page=1&limit=20`,
    { tlsInsecureSkipVerify: true }
  );
  check(res, {
    '200 OK': (r) => r.status === 200,
    'X-Cache header present': (r) => r.headers['X-Cache'] !== undefined,
  });
  cacheHits.add(res.headers['X-Cache'] === 'HIT');
  sleep(0.2);
}
