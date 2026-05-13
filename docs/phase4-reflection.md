# Phase 4 Reflection

> Fill in the measured numbers and observations after running the verification
> steps in `phase4-deployment.md` and the k6 scripts in `stress/`.

## Goals (recap)

- Multi-container Docker orchestration of all seven services.
- Nginx as the single ingress with HTTPS.
- Redis-backed BullMQ queues with an isolated worker container.
- Cache the trending feed in Redis with versioned invalidation.
- Verify the stack under concurrent load with k6.

## Architectural decisions

### Worker isolation
We split the backend into two containers built from the *same image*:
`backend` runs `node server.js`, `worker` runs `node worker.js`. They share
the same source tree, dependency tree, and version. This trade-off:
- **Pros:** API stays responsive when ffprobe pins a core; one image to
  build and version; queue back-pressure is visible (the worker container
  can be scaled separately).
- **Cons:** doubles the resident memory of the Node runtime; coordination
  via Redis only (no shared memory).

### Cache invalidation via version bump
`bustTrending()` calls `INCR trending:version`. Cache keys embed the current
version, so a bump effectively orphans every cached entry without a `KEYS`
scan. Old keys age out via Redis LRU.
- **Pros:** O(1) invalidation; race-free; no global lock.
- **Cons:** burns a Redis slot per orphaned key until it's evicted. Not a
  concern at our cardinality (a few pages × small TTL).

### Two S3 clients
The internal `s3Client` (endpoint `http://minio:9000`) handles PUT/HEAD/DELETE
from inside the Docker network. A second `s3PublicClient`
(endpoint `https://clipsphere.local`) is used *only* for `getSignedUrl`.
Without this split, presigned URLs encode the internal hostname and the
browser cannot resolve them. Nginx routes the bucket-path prefixes
(`/clipsphere-videos/*`, `/clipsphere-avatars/*`) straight through with no
rewrite — any prefix rewrite would change the canonical path the SDK signed
and MinIO would 403 with `SignatureDoesNotMatch`.

### `proxy_request_buffering off` on `/api/`
Lets Nginx stream upload bodies straight through. Without it Nginx buffers
the full multipart body before forwarding, doubling memory pressure and
adding latency on large videos.

### Helmet CSP
Helmet's default CSP turns on in production. We verified the Next.js
build runs cleanly against it. If a third-party widget is added later it may
need an explicit CSP allowlist.

## Measurements

> Run the k6 scripts and paste the summary block here.

### Trending feed (`stress/k6/trending.js`)

```
http_req_duration   avg=??? p(95)=???
http_req_failed     rate=???
cache_hits          rate=???
iterations          ??? total
```

Observations:
- HIT ratio climbs to ___ within the first ___ s.
- p95 baseline (cold): ___ ms; warmed: ___ ms.

### Upload stress (`stress/k6/upload.js`)

```
http_req_duration   avg=??? p(95)=???
http_req_failed     rate=???
iterations          ??? total / ??? successful
```

Worker drain time after k6 exits: `bull:video:wait` reached 0 within ___ s
(measured via `docker compose exec redis redis-cli LLEN bull:video:wait`).

## What surprised us

> Three to five things you learned that weren't obvious going in.
> Examples to fill in: the MinIO presigned-URL hostname trap, helmet CSP
> blocking inline Next assets, `proxy_request_buffering` on uploads, BullMQ
> needing `maxRetriesPerRequest: null`, `output: 'standalone'` in
> `next.config.ts` being mandatory for the slim runtime image.

1. …
2. …
3. …

## What we'd do differently next time

> Honest list. No marketing-speak.

- …
- …

## Out of scope (deliberately)

- Multi-replica backend with Socket.io adapter.
- TLS termination at a load balancer (we terminate at the container).
- Centralized logging / tracing.
- Backups for the named volumes.

## Deployment guide

See [`phase4-deployment.md`](phase4-deployment.md). A clean
`docker compose down -v && docker compose up -d --build` produces a working
stack with the steps in that file.
