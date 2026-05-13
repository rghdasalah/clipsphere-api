const Video = require('../models/Video');
const Follower = require('../models/Follower');
const { getReviewAggregationStages } = require('./reviewAggregation.service');

exports.getFollowingFeed = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  // Get IDs of users this person follows
  const following = await Follower.find({ followerId: userId }).select('followingId');
  const followingIds = following.map(f => f.followingId);

  if (followingIds.length === 0) {
    return { videos: [], page, totalPages: 0 };
  }

  const pipeline = [
    { $match: { owner: { $in: followingIds }, status: 'public' } },
    // Lookup owner info
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: '_owner'
      }
    },
    { $unwind: '$_owner' },
    {
      $addFields: {
        owner: {
          _id: '$_owner._id',
          username: '$_owner.username',
          avatarKey: '$_owner.avatarKey'
        }
      }
    },
    { $project: { _owner: 0 } },
    // Aggregate like counts
    {
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'video',
        as: '_likes'
      }
    },
    { $addFields: { likeCount: { $size: '$_likes' } } },
    { $project: { _likes: 0 } },
    // Sort by newest first
    { $sort: { createdAt: -1 } },
    // Facet for pagination
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        videos: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];

  const [result] = await Video.aggregate(pipeline);
  const total = result.metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return { videos: result.videos, page, totalPages };
};

// Bonus: "For You" feed — followed-user videos first, then everything else
// sorted by trendingScore + a freshness bonus that decays linearly over 7 days.
// One aggregation, single round-trip, paginated via $facet.
exports.getForYouFeed = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const following = await Follower.find({ followerId: userId }).select('followingId');
  const followingIds = following.map((f) => f.followingId);

  const pipeline = [
    { $match: { status: 'public' } },
    {
      $addFields: {
        isFollowed: { $in: ['$owner', followingIds] },
        // ms-since-creation → hours
        hoursSinceCreated: {
          $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 3600000],
        },
      },
    },
    {
      $addFields: {
        // Linear decay from +168 (just uploaded) to 0 at the 7-day mark.
        freshnessBonus: {
          $max: [0, { $subtract: [168, '$hoursSinceCreated'] }],
        },
      },
    },
    {
      $addFields: {
        effectiveScore: {
          $add: [{ $ifNull: ['$trendingScore', 0] }, '$freshnessBonus'],
        },
      },
    },
    // Owner info (same shape the other feeds expose)
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: '_owner',
      },
    },
    { $unwind: '$_owner' },
    {
      $addFields: {
        owner: {
          _id: '$_owner._id',
          username: '$_owner.username',
          avatarKey: '$_owner.avatarKey',
        },
      },
    },
    { $project: { _owner: 0, hoursSinceCreated: 0 } },
    // Like count for the card UI
    {
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'video',
        as: '_likes',
      },
    },
    { $addFields: { likeCount: { $size: '$_likes' } } },
    { $project: { _likes: 0 } },
    // Followed-first, then by effectiveScore, then by recency as tiebreaker
    { $sort: { isFollowed: -1, effectiveScore: -1, createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        videos: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ];

  const [result] = await Video.aggregate(pipeline);
  const total = result.metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return { videos: result.videos, page, totalPages };
};

exports.getTrendingFeed = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: { status: 'public' } },
    // Lookup owner info
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: '_owner'
      }
    },
    { $unwind: '$_owner' },
    {
      $addFields: {
        owner: {
          _id: '$_owner._id',
          username: '$_owner.username',
          avatarKey: '$_owner.avatarKey'
        }
      }
    },
    { $project: { _owner: 0 } },
    // Aggregate like counts
    {
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'video',
        as: '_likes'
      }
    },
    { $addFields: { likeCount: { $size: '$_likes' } } },
    { $project: { _likes: 0 } },
    // Review aggregation for trending sort
    ...getReviewAggregationStages(),
    // LOCKED trending sort: averageRating desc, latestReviewAt desc, createdAt desc
    { $sort: { averageRating: -1, latestReviewAt: -1, createdAt: -1 } },
    // Facet for pagination
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        videos: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];

  const [result] = await Video.aggregate(pipeline);
  const total = result.metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return { videos: result.videos, page, totalPages };
};
