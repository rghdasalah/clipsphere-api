# Phase 4 Deployment Guide

This brings the whole ClipSphere stack up from a fresh clone in ~5 minutes.

## Prerequisites

- Docker Engine + Compose v2 (`docker compose version` should print v2.x).
- `openssl` for the self-signed cert (any modern OS has it).
- `ffmpeg` *optionally* on the host, only if you want to generate the stress
  fixture (see `stress/README.md`).

## One-time setup

1. Clone and enter the repo:
   ```bash
   git clone <repo-url>
   cd Web-Project/clipsphere-api
   ```

2. Copy the env template and fill in real secrets:
   ```bash
   cp .env.example .env
   # At minimum, change JWT_SECRET to a long random string.
   ```

3. Generate the self-signed cert for `clipsphere.local`:
   ```bash
   bash scripts/gen-certs.sh
   ```

4. Add a hosts entry so the browser can resolve `clipsphere.local`:
   ```bash
   echo "127.0.0.1 clipsphere.local" | sudo tee -a /etc/hosts
   ```

## Bring it up

```bash
docker compose up -d --build
```

The first build takes a few minutes (backend + frontend images). Subsequent
starts reuse the cached layers.

Watch the rollout until everything is healthy:

```bash
docker compose ps
```

All seven services should report `running` and most should be `healthy`. The
worker uses an HTTP health endpoint on port 9100 (internal).

## Verify

- Open `https://clipsphere.local/` — accept the self-signed cert warning the
  first time. The Next.js home page should render.
- `curl -k https://clipsphere.local/api/v1/health` returns
  `{"status":"success", ...}`.
- `https://clipsphere.local/api-docs` opens Swagger UI.
- MinIO console: `http://localhost:9001` (login with `MINIO_ROOT_USER` /
  `MINIO_ROOT_PASSWORD` from `.env`).

## Seed a stress / admin account

```bash
docker compose exec backend node scripts/seed-test-admin.js
```

## Trigger a Stripe webhook (test mode)

In a separate terminal, with the Stripe CLI installed and logged in:

```bash
stripe listen --forward-to https://clipsphere.local/api/v1/tips/webhook \
              --skip-verify
stripe trigger checkout.session.completed
```

The `--skip-verify` flag is for the self-signed cert.

## Stress testing

See `stress/README.md`. Quick smoke test:

```bash
docker run --rm -i --network host \
  -e BASE_URL=https://clipsphere.local \
  -v "$PWD/stress:/stress" grafana/k6 run /stress/k6/trending.js
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_CERT_AUTHORITY_INVALID` in browser | Self-signed cert not trusted | Accept the warning, or use `mkcert` (see `nginx/certs/README.md`) |
| Frontend stuck on "loading" | `BACKEND_INTERNAL_URL` wrong | Confirm compose env still points to `http://backend:5000` |
| Uploads fail with 413 | Nginx `client_max_body_size` too low | Already set to 150 MB — check that Nginx reloaded after a config change |
| Presigned URLs return DNS error in browser | `MINIO_PUBLIC_URL` not set | Set to `https://clipsphere.local` in `.env`, restart backend |
| Presigned URLs return 403 `SignatureDoesNotMatch` | Nginx rewrite changed the canonical path | Confirm `/clipsphere-(videos\|avatars)/` location has no `rewrite` directive |
| Worker exits immediately | `REDIS_URL` or `MONGODB_URI` not set | Check `docker compose logs worker` |
| Port 80 already in use | Another web server on host | Stop it or remap nginx port in `docker-compose.yml` |

## Tear down

```bash
# Stop containers, keep volumes (videos and DB survive a restart)
docker compose down

# Wipe everything including videos and database
docker compose down -v
```

## Production gaps (intentional)

This is a course-project local deployment. Before going to real production:
- replace self-signed cert with a CA-signed one (Let's Encrypt or similar);
- replace MinIO with a managed object store;
- run more than one backend replica with `@socket.io/redis-adapter` and Nginx
  `ip_hash`;
- run Redis with a replica or move to a managed Redis offering;
- centralize logs (today Nginx logs to stdout, backend to stdout; both are
  captured by `docker compose logs`).
