const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const notificationController = require('../controllers/notification.controller');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app activity feed for the authenticated user
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the authenticated user's notifications (most recent first)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: Paginated notification list
 */
router.get('/', protect, notificationController.getMyNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get the unread notification count for the authenticated user
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', protect, notificationController.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for the authenticated user
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Marked all as read
 */
router.patch('/read-all', protect, notificationController.markAllRead);

module.exports = router;