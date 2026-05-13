// Stress test: concurrent video uploads. Verifies that the 300-second gate,
// MinIO storage, and worker probe queue all survive parallel uploads.
//
// Usage:
//   docker run --rm -i --network host \
//     -e BASE_URL=https://clipsphere.local \
//     -e UPLOAD_EMAIL=stress@clipsphere.local \
//     -e UPLOAD_PASS=Stress12345 \
//     -v "$PWD/stress:/stress" grafana/k6 run /stress/k6/upload.js
//
// Pre-flight: a user with UPLOAD_EMAIL / UPLOAD_PASS must exist. Use the
// seed-test-admin.js helper or create the account manually before running.
//
// Acceptance:
//   * http_req_failed < 2 %
//   * p(95) < 8 s for the upload POST
//   * Redis 'video' queue drains within 30 s of test completion.
import http from 'k6/http';
import { check } from 'k6';
import { login } from './auth-setup.js';

export const options = {
  scenarios: {
    uploads: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 5,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<8000'],
  },
  insecureSkipTLSVerify: true,
};

const BASE  = __ENV.BASE_URL     || 'https://clipsphere.local';
const EMAIL = __ENV.UPLOAD_EMAIL || 'stress@clipsphere.local';
const PASS  = __ENV.UPLOAD_PASS  || 'Stress12345';

export function setup() {
  const token = login(BASE, EMAIL, PASS);
  // k6 v0.45+ exposes open() for binary reads via 'b' mode.
  const file = open('../fixtures/sample-5s.mp4', 'b');
  return { token, file };
}

export default function (data) {
  const body = {
    video: http.file(data.file, `k6-${__VU}-${__ITER}.mp4`, 'video/mp4'),
    title: `k6 upload ${__VU}-${__ITER}`,
    description: 'stress test upload',
    status: 'public',
  };
  const res = http.post(`${BASE}/api/v1/videos/upload`, body, {
    headers: { Authorization: `Bearer ${data.token}` },
    tlsInsecureSkipVerify: true,
    timeout: '120s',
  });
  check(res, {
    'upload 201': (r) => r.status === 201,
  });
}
