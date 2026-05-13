const TRENDING_VERSION_KEY = 'trending:version';

const trendingKey = (version, page, limit) =>
  `cache:trending:v${version}:p${page}:l${limit}`;

module.exports = { TRENDING_VERSION_KEY, trendingKey };
