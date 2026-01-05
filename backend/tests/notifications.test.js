import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { Notification } from '../src/models/Notification.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'notifuser',
  email: 'notifuser@example.com',
  password: 'SuperSecurePass1',
};

const registerAndLogin = async (overrides = {}) => {
  const payload = { ...userCredentials, ...overrides };
  const response = await request(app).post('/api/auth/register').send(payload);
  return {
    token: response.body.token,
    user: response.body.user,
  };
};

describe('Notification API', () => {
  describe('GET /api/notifications', () => {
    it('returns empty array when no notifications', async () => {
      const { token } = await registerAndLogin();

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('returns notifications for authenticated user', async () => {
      const { token, user } = await registerAndLogin();

      // Create a test notification directly in the database
      await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'Test Notification',
        message: 'You have been assigned to a card',
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].title).toBe('Test Notification');
      expect(res.body.notifications[0].type).toBe('card_assigned');
    });

    it('supports pagination', async () => {
      const { token, user } = await registerAndLogin();

      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await Notification.create({
          recipient: user.id,
          type: 'card_assigned',
          title: `Notification ${i}`,
          message: 'Test message',
        });
      }

      const res = await request(app)
        .get('/api/notifications?limit=2&page=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });

    it('filters by unread', async () => {
      const { token, user } = await registerAndLogin();

      await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'Read Notification',
        message: 'Test message',
        read: true,
      });

      await Notification.create({
        recipient: user.id,
        type: 'comment',
        title: 'Unread Notification',
        message: 'Test message',
        read: false,
      });

      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].title).toBe('Unread Notification');
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('returns unread count', async () => {
      const { token, user } = await registerAndLogin();

      await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'Read',
        message: 'Test',
        read: true,
      });

      await Notification.create({
        recipient: user.id,
        type: 'comment',
        title: 'Unread 1',
        message: 'Test',
        read: false,
      });

      await Notification.create({
        recipient: user.id,
        type: 'mention',
        title: 'Unread 2',
        message: 'Test',
        read: false,
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const { token, user } = await registerAndLogin();

      const notification = await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'Test',
        message: 'Test',
        read: false,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.read).toBe(true);

      // Verify in database
      const updated = await Notification.findById(notification._id);
      expect(updated.read).toBe(true);
    });

    it('returns 404 for non-existent notification', async () => {
      const { token } = await registerAndLogin();

      const res = await request(app)
        .patch('/api/notifications/507f1f77bcf86cd799439011/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('prevents marking other users notification as read', async () => {
      const { user: user1 } = await registerAndLogin({
        username: 'user1notif',
        email: 'user1notif@example.com',
      });
      const { token: token2 } = await registerAndLogin({
        username: 'user2notif',
        email: 'user2notif@example.com',
      });

      const notification = await Notification.create({
        recipient: user1.id,
        type: 'card_assigned',
        title: 'Test',
        message: 'Test',
        read: false,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('marks all notifications as read', async () => {
      const { token, user } = await registerAndLogin();

      await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'Notif 1',
        message: 'Test',
        read: false,
      });

      await Notification.create({
        recipient: user.id,
        type: 'comment',
        title: 'Notif 2',
        message: 'Test',
        read: false,
      });

      const res = await request(app)
        .post('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All notifications marked as read');

      // Verify in database
      const unread = await Notification.countDocuments({
        recipient: user.id,
        read: false,
      });
      expect(unread).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('deletes a notification', async () => {
      const { token, user } = await registerAndLogin();

      const notification = await Notification.create({
        recipient: user.id,
        type: 'card_assigned',
        title: 'To Delete',
        message: 'Test',
      });

      const res = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify deleted
      const deleted = await Notification.findById(notification._id);
      expect(deleted).toBeNull();
    });

    it('returns 404 for non-existent notification', async () => {
      const { token } = await registerAndLogin();

      const res = await request(app)
        .delete('/api/notifications/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('prevents deleting other users notification', async () => {
      const { user: user1 } = await registerAndLogin({
        username: 'deluser1',
        email: 'deluser1@example.com',
      });
      const { token: token2 } = await registerAndLogin({
        username: 'deluser2',
        email: 'deluser2@example.com',
      });

      const notification = await Notification.create({
        recipient: user1.id,
        type: 'card_assigned',
        title: 'Test',
        message: 'Test',
      });

      const res = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });
  });
});

describe('Notification Triggers', () => {
  it('creates notification when user is assigned to a card', async () => {
    const { token: ownerToken } = await registerAndLogin({
      username: 'cardowner1',
      email: 'cardowner1@example.com',
    });
    const { token: memberToken, user: member } = await registerAndLogin({
      username: 'cardmember1',
      email: 'cardmember1@example.com',
    });

    // Create board and add member
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Notification Test Board' });
    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: member.id });

    // Create list and card
    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Test Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Assign member to card
    await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assignedMembers: [member.id] });

    // Check notification was created
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications).toHaveLength(1);
    expect(notifRes.body.notifications[0].type).toBe('card_assigned');
    expect(notifRes.body.notifications[0].title).toBe('You were assigned to a card');
  });

  it('creates notification when comment is added to assigned card', async () => {
    const { token: ownerToken } = await registerAndLogin({
      username: 'commentowner',
      email: 'commentowner@example.com',
    });
    const { token: memberToken, user: member } = await registerAndLogin({
      username: 'commentmember',
      email: 'commentmember@example.com',
    });

    // Create board and add member
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Comment Test Board' });
    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: member.id });

    // Create list and card with member assigned
    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Commented Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Assign member to card
    await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assignedMembers: [member.id] });

    // Clear notifications from assignment
    await Notification.deleteMany({ recipient: member.id });

    // Add comment
    await request(app)
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ text: 'This is a comment' });

    // Check notification was created
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBeGreaterThanOrEqual(1);
    const commentNotif = notifRes.body.notifications.find((n) => n.type === 'comment');
    expect(commentNotif).toBeDefined();
    expect(commentNotif.title).toBe('New comment on your card');
  });

  it('creates notification when user is mentioned in comment', async () => {
    const { token: ownerToken } = await registerAndLogin({
      username: 'mentionowner',
      email: 'mentionowner@example.com',
    });
    const { token: mentionedToken, user: mentioned } = await registerAndLogin({
      username: 'mentioneduser',
      email: 'mentioneduser@example.com',
    });

    // Create board and add member
    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Mention Test Board' });
    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: mentioned.id });

    // Create list and card
    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Mention Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Add comment with mention
    await request(app)
      .post(`/api/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ text: 'Hey @mentioneduser please check this out!' });

    // Check notification was created
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${mentionedToken}`);

    expect(notifRes.status).toBe(200);
    const mentionNotif = notifRes.body.notifications.find((n) => n.type === 'mention');
    expect(mentionNotif).toBeDefined();
    expect(mentionNotif.title).toBe('You were mentioned');
  });
});
