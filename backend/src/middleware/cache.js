const { connection } = require('../config/redis');
const { TRENDING_VERSION_KEY, trendingKey } = require('../utils/cacheKeys');

async function getVersion() {
  let v = await connection.get(TRENDING_VERSION_KEY);
  if (v == null) {
    await connection.set(TRENDING_VERSION_KEY, '1');
    v = '1';
  }
  return v;
}

exports.bustTrending = async () => {
  try {
    await connection.incr(TRENDING_VERSION_KEY);
  } catch (err) {
    console.warn('[cache] failed to bust trending:', err.message);
  }
};

exports.trendingCache = (ttlSeconds = 60) => async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const version = await getVersion();
    const key = trendingKey(version, page, limit);

    const cached = await connection.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.type('application/json').send(cached);
    }

    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Fire-and-forget cache write.
      connection
        .set(key, JSON.stringify(body), 'EX', ttlSeconds)
        .catch((err) => console.warn('[cache] write failed:', err.message));
      return originalJson(body);
    };
    next();
  } catch (err) {
    // Cache must never break a request.
    console.warn('[cache] middleware error:', err.message);
    res.set('X-Cache', 'ERROR');
    next();
  }
};
