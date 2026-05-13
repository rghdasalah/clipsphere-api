const Notification = require('../models/Notification');
const { enqueueEngagementEmail } = require('../queues/email.queue');

const buildNotificationPayload = ({ recipientId, actorId, type, videoId }) => ({
  recipient: recipientId,
  actor: actorId,
  type,
  channel: 'inApp',
  ...(videoId ? { video: videoId } : {})
});

exports.handlePreferenceAwareNotification = async ({
  recipientUser,
  actorId,
  type,
  preferenceKey,
  videoId
}) => {
  const notifications = {
    inApp: []
  };

  if (!recipientUser) {
    return notifications;
  }

  const recipientId = recipientUser._id
    ? recipientUser._id.toString()
    : String(recipientUser);
  const normalizedActorId = actorId.toString();

  if (recipientId === normalizedActorId) {
    return notifications;
  }

  const prefs = recipientUser.notificationPreferences;

  if (prefs?.inApp?.[preferenceKey]) {
    const notification = await Notification.create(
      buildNotificationPayload({
        recipientId,
        actorId: normalizedActorId,
        type,
        videoId
      })
    );

    notifications.inApp.push(notification);
  }

  if (prefs?.email?.[preferenceKey]) {
    enqueueEngagementEmail(recipientUser, actorId, type, { videoId }).catch(
      (err) => console.warn('[notification] engagement enqueue failed:', err.message)
    );
  }

  return notifications;
};
