import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { broadcastToUser } from '../socket/index.js';
import { logger } from '../utils/logger.js';

const toResponse = (notification) => ({
  id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  board: notification.board?.toString() ?? null,
  card: notification.card?.toString() ?? null,
  actor: notification.actor
    ? {
        id: notification.actor._id?.toString() ?? notification.actor.toString(),
        username: notification.actor.username ?? null,
        avatarUrl: notification.actor.avatarUrl ?? null,
      }
    : null,
  read: notification.read,
  createdAt: notification.createdAt,
});

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  boardId = null,
  cardId = null,
  actorId = null,
}) => {
  if (actorId && recipientId && actorId.toString() === recipientId.toString()) {
    return null;
  }

  const notification = new Notification({
    recipient: recipientId,
    type,
    title,
    message,
    board: boardId,
    card: cardId,
    actor: actorId,
  });

  await notification.save();

  // Populate actor for the response and broadcast
  await notification.populate('actor', '_id username avatarUrl');

  // Broadcast to recipient via socket
  logger.info(`Broadcasting notification to user ${recipientId}: ${type} - ${title}`);
  broadcastToUser(recipientId.toString(), 'notification:new', {
    notification: toResponse(notification),
  });

  return notification;
};

export const createNotifications = async ({
  recipientIds,
  type,
  title,
  message,
  boardId = null,
  cardId = null,
  actorId = null,
}) => {
  const notifications = [];

  for (const recipientId of recipientIds) {
    if (actorId && recipientId.toString() === actorId.toString()) {
      continue;
    }

    notifications.push({
      recipient: recipientId,
      type,
      title,
      message,
      board: boardId,
      card: cardId,
      actor: actorId,
    });
  }

  if (notifications.length > 0) {
    const inserted = await Notification.insertMany(notifications);

    // Populate actors and broadcast to each recipient
    for (const notification of inserted) {
      await notification.populate('actor', '_id username avatarUrl');
      logger.info(
        `Broadcasting notification to user ${notification.recipient}: ${type} - ${title}`,
      );
      broadcastToUser(notification.recipient.toString(), 'notification:new', {
        notification: toResponse(notification),
      });
    }
  }

  return notifications;
};

export const getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .populate('actor', '_id username avatarUrl'),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    return res.status(200).json({
      notifications: notifications.map(toResponse),
      total,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({ notification: toResponse(notification) });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } },
    );

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await notification.deleteOne();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const extractMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  return [...new Set(matches.map((match) => match[1]))];
};

export const resolveUsernames = async (usernames) => {
  if (!usernames || usernames.length === 0) return [];

  const users = await User.find({
    username: { $in: usernames },
  }).select('_id username');

  return users.map((u) => ({ id: u._id.toString(), username: u.username }));
};
