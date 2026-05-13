// One-time backfill: compute trendingScore for every existing Video from its
// current likes and reviews. Idempotent — running it again recomputes from the
// same source data and produces the same numbers.
//
// Usage:
//   docker compose exec backend node scripts/backfill-trending-score.js
//
// Formula matches the live increment logic:
//   trendingScore = likeCount * 10 + sum(review.rating * 2)
//
// Freshness is intentionally NOT baked in here — it's computed at query time
// in feed.service.js getForYouFeed so the stored value stays stable.

require('dotenv').config();
const mongoose = require('mongoose');

const Video = require('../src/models/Video');
const Like = require('../src/models/Like');
const Review = require('../src/models/Review');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log(`[backfill] connected to ${process.env.MONGODB_URI}`);

  let processed = 0;
  let max = -Infinity;
  let min = Infinity;
  let totalScore = 0;

  const cursor = Video.find({}, { _id: 1 }).cursor();
  for await (const { _id } of cursor) {
    const likeCount = await Like.countDocuments({ video: _id });
    const reviews = await Review.find({ video: _id }, { rating: 1 });
    const reviewScore = reviews.reduce((sum, r) => sum + r.rating * 2, 0);
    const trendingScore = likeCount * 10 + reviewScore;

    await Video.updateOne({ _id }, { $set: { trendingScore } });

    processed += 1;
    totalScore += trendingScore;
    if (trendingScore > max) max = trendingScore;
    if (trendingScore < min) min = trendingScore;
  }

  if (processed === 0) {
    console.log('[backfill] no videos to update');
  } else {
    const avg = (totalScore / processed).toFixed(1);
    console.log(
      `[backfill] updated ${processed} video(s): max=${max} min=${min} avg=${avg}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill] failed:', err);
  process.exit(1);
});
