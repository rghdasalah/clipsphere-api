# ClipSphere Phase 4 Stress Tests

These k6 scripts verify that the dockerized stack survives concurrent load:

| Script | What it measures |
|--------|------------------|
| `k6/trending.js` | Trending feed latency + cache hit ratio under 200 VU ramping load |
| `k6/upload.js`   | Concurrent multipart video uploads through Nginx -> backend -> MinIO, with worker probe drain |

## Prerequisites

1. The full stack is running: `docker compose up -d --build` from the repo root.
2. `/etc/hosts` contains `127.0.0.1 clipsphere.local`.
3. For the upload script: a stress-test user exists. Quickest way:

   ```bash
   docker compose exec backend node -e '
     const m=require("mongoose");const b=require("bcryptjs");
     const U=require("./src/models/User");
     (async()=>{
       await m.connect(process.env.MONGODB_URI);
       const p=await b.hash("Stress12345",10);
       await U.findOneAndUpdate(
         {email:"stress@clipsphere.local"},
         {username:"stressuser",email:"stress@clipsphere.local",password:p},
         {upsert:true}
       );
       console.log("ok");
       process.exit(0);
     })();
   '
   ```

4. A small fixture video at `stress/fixtures/sample-5s.mp4` (~1 MB, under 5 s).
   You can generate one with:

   ```bash
   ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=15 \
          -c:v libx264 -pix_fmt yuv420p stress/fixtures/sample-5s.mp4
   ```

## Running

```bash
# Trending feed cache test
docker run --rm -i --network host \
  -e BASE_URL=https://clipsphere.local \
  -v "$PWD/stress:/stress" grafana/k6 run /stress/k6/trending.js

# Upload stress test
docker run --rm -i --network host \
  -e BASE_URL=https://clipsphere.local \
  -e UPLOAD_EMAIL=stress@clipsphere.local \
  -e UPLOAD_PASS=Stress12345 \
  -v "$PWD/stress:/stress" grafana/k6 run /stress/k6/upload.js
```

## Verifying the worker drained the queue

After the upload run, check that the BullMQ `video` queue cleared:

```bash
docker compose exec redis redis-cli LLEN bull:video:wait
docker compose exec redis redis-cli LLEN bull:video:active
```

Both should be 0 within ~30 s of test completion.

## Acceptance criteria

- `trending.js`: `http_req_failed < 1 %`, `p(95) < 300 ms`, `cache_hits > 95 %`.
- `upload.js`:   `http_req_failed < 2 %`, `p(95) < 8 s`, queue empty within 30 s.

Record the numbers in `docs/phase4-reflection.md`.
