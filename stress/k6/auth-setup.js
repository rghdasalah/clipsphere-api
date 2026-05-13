// Shared helper: log in once and return a JWT. Use from setup() of other scripts.
import http from 'k6/http';
import { check } from 'k6';

export function login(baseUrl, email, password) {
  const res = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tlsInsecureSkipVerify: true,
    }
  );
  const ok = check(res, { 'login returned 200': (r) => r.status === 200 });
  if (!ok) {
    throw new Error(`login failed: ${res.status} ${res.body}`);
  }
  // Backend response shape: { status: 'success', data: { token, user } }
  return res.json('data.token');
}
