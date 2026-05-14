const Video = require('../models/Video');
const Review = require('../models/Review');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('./notification.service');
const { deleteObject } = require('./storage.service');
const { VIDEOS_BUCKET } = require('../config/s3');
const { bustTrending } = require('../middleware/cache');

exports.createVideo = async (userId, data) => {
  const video = await Video.create({ ...data, owner: userId });
  await video.populate('owner', 'username avatarKey');
  if ((data.status || 'public') === 'public') bustTrending();
  return video;
};

exports.getVideos = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return Video.find({ status: 'public' })
    .populate('owner', 'username avatarKey')
    .skip(skip)
    .limit(limit);
};

exports.updateVideo = async (videoId, updates) => {
  const video = await Video.findById(videoId);
  if (!video) throw new AppError('Video not found', 404);

  Object.assign(video, updates);
  await video.save();
  await video.populate('owner', 'username avatarKey');
  if (video.status === 'public') bustTrending();
  return video;
};

exports.deleteVideo = async (videoId) => {
  const video = await Video.findById(videoId);
  if (!video) throw new AppError('Video not found', 404);

  const objectKey = video.key;
  const wasPublic = video.status === 'public';
  await video.deleteOne();

  if (objectKey) {
    try {
      await deleteObject(VIDEOS_BUCKET, objectKey);
    } catch (err) {
      console.error(`Failed to delete S3 object ${objectKey}:`, err.message);
    }
  }
  if (wasPublic) bustTrending();
};

exports.addReview = async (userId, videoId, data, io) => {
  const video = await Video.findById(videoId);
  if (!video) throw new AppError('Video not found', 404);

  const review = await Review.create({ ...data, user: userId, video: videoId });
  await review.populate('user', 'username avatarKey');
  const videoOwner = await User.findById(video.owner);

  // Real-time socket notification to the video owner's private room — gated on
  // the recipient's in-app "comments" preference (reviews map to the comments
  // toggle, same as the persisted notification below).
  if (
    io &&
    videoOwner &&
    video.owner.toString() !== userId.toString() &&
    videoOwner.notificationPreferences?.inApp?.comments
  ) {
    io.to(video.owner.toString()).emit('new-review', {
      reviewerUsername: review.user?.username ?? 'Someone',
      rating: review.rating,
      videoTitle: video.title,
      videoId: video._id.toString()
    });
  }

  await notificationService.handlePreferenceAwareNotification({
    recipientUser: videoOwner,
    actorId: userId,
    type: 'comment',
    preferenceKey: 'comments',
    videoId: video._id
  });

  // Bonus: each review adds rating*2 to trendingScore (create-only — update/delete
  // are intentionally NOT tracked; see plan limitations).
  await Video.findByIdAndUpdate(videoId, { $inc: { trendingScore: data.rating * 2 } });

  // Reviews influence the trending sort (averageRating, latestReviewAt).
  bustTrending();
  return review;
};
