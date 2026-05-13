const Like = require('../models/Like');
const Video = require('../models/Video');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('./notification.service');
const { bustTrending } = require('../middleware/cache');

exports.likeVideo = async (userId, videoId, io) => {
  const video = await Video.findById(videoId);
  if (!video) throw new AppError('Video not found', 404);

  try {
    await Like.create({ user: userId, video: videoId });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('You have already liked this video', 409);
    }
    throw err;
  }

  const likeCount = await Like.countDocuments({ video: videoId });

  const videoOwner = await User.findById(video.owner);

  // Real-time socket notification to the video owner's private room
  if (io && videoOwner && video.owner.toString() !== userId.toString()) {
    const liker = await User.findById(userId).select('username');
    io.to(video.owner.toString()).emit('new-like', {
      likerUsername: liker?.username ?? 'Someone',
      videoTitle: video.title,
      videoId: video._id.toString()
    });
  }

  await notificationService.handlePreferenceAwareNotification({
    recipientUser: videoOwner,
    actorId: userId,
    type: 'like',
    preferenceKey: 'likes',
    videoId: video._id
  });

  await Video.findByIdAndUpdate(videoId, { $inc: { trendingScore: 10 } });
  bustTrending();
  return { likeCount };
};

exports.unlikeVideo = async (userId, videoId) => {
  const video = await Video.findById(videoId);
  if (!video) throw new AppError('Video not found', 404);

  const result = await Like.findOneAndDelete({ user: userId, video: videoId });
  if (!result) throw new AppError('Like not found', 404);

  const likeCount = await Like.countDocuments({ video: videoId });
  await Video.findByIdAndUpdate(videoId, { $inc: { trendingScore: -10 } });
  bustTrending();
  return { likeCount };
};