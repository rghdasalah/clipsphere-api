const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/errorHandler');

exports.getHealth = () => {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  };
};

exports.getStats = async () => {
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalVideos, tipsAgg, mostActiveUsers] = await Promise.all([
    User.countDocuments(),
    Video.countDocuments(),
    Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Video.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: '$owner',
          videoCount: { $sum: 1 }
        }
      },
      {
        $sort: {
          videoCount: -1
        }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          owner: '$_id',
          videoCount: 1,
          username: '$user.username',
          avatarKey: '$user.avatarKey'
        }
      }
    ])
  ]);

  const totalTipsCents = tipsAgg[0]?.total || 0;

  return {
    totalUsers,
    totalVideos,
    totalTips: totalTipsCents,
    totalTipsFormatted: `$${(totalTipsCents / 100).toFixed(2)}`,
    mostActiveUsers
  };
};

exports.setUserStatus = async (targetUserId, status) => {
  const allowedStatuses = ['active', 'suspended', 'banned'];

  if (!allowedStatuses.includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    targetUserId,
    {
      active: status === 'active',
      accountStatus: status
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  return updatedUser;
};

exports.getModerationQueue = async () => {
  const flagged = await Video.find({ status: 'flagged' }).lean();

  const lowRatedAgg = await Review.aggregate([
    {
      $group: {
        _id: '$video',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    },
    {
      $match: {
        averageRating: { $lt: 2 }
      }
    }
  ]);

  const lowRatedVideoIds = lowRatedAgg.map((item) => item._id);
  const lowRatedVideosRaw = lowRatedVideoIds.length
    ? await Video.find({ _id: { $in: lowRatedVideoIds } }).lean()
    : [];

  const flaggedIds = new Set(flagged.map((video) => String(video._id)));
  const lowRated = lowRatedVideosRaw.filter(
    (video) => !flaggedIds.has(String(video._id))
  );

  return {
    flagged,
    lowRated
  };
};