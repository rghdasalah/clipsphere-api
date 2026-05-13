const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    videoURL: {
      type: String,
      required: true
    },
    key: {
      type: String
    },
    thumbnailKey: {
      type: String
    },
    duration: {
      type: Number,
      required: true,
      max: 300 // 5 minutes
    },
    // Populated asynchronously by the worker container after upload.
    width: { type: Number },
    height: { type: Number },
    codec: { type: String },
    // Bonus: incremental trending score. Likes +10, reviews +rating*2. Freshness
    // bonus is added at query time in feed.service.js getForYouFeed.
    trendingScore: { type: Number, default: 0, index: true },
    viewsCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['public', 'private', 'flagged'],
      default: 'public'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', videoSchema);
