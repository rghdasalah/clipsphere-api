const Notification = require('../models/Notification');
const { asyncWrapper } = require('../middleware/errorHandler');

exports.getMyNotifications = asyncWrapper(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { recipient: req.user.id };
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'username avatarKey')
      .populate('video', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
  ]);

  res.json({
    status: 'success',
    data: {
      notifications,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  });
});

exports.getUnreadCount = asyncWrapper(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    read: false,
  });
  res.json({ status: 'success', data: { unreadCount } });
});

exports.markAllRead = asyncWrapper(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({
    status: 'success',
    data: { modified: result.modifiedCount ?? 0 },
  });
});