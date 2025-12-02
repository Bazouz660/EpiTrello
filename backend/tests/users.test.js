import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const baseUser = {
  username: 'profileUser',
  email: 'profile@example.com',
  password: 'S3cureP@ssw0rd!#',
};

const registerAndLogin = async (overrides = {}) => {
  const payload = { ...baseUser, ...overrides };
  const response = await request(app).post('/api/auth/register').send(payload);
  return response.body;
};

describe('Users API', () => {
  it('returns the authenticated user profile with metadata', async () => {
    const { token } = await registerAndLogin();

    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      username: baseUser.username,
      email: baseUser.email,
    });
    expect(response.body.user.createdAt).toBeTruthy();
  });

  it('updates username and email and returns the new profile representation', async () => {
    const { token } = await registerAndLogin();

    const response = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .field('username', 'updatedName')
      .field('email', 'updated@example.com');

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('updatedName');
    expect(response.body.user.email).toBe('updated@example.com');
  });

  it('accepts an avatar upload and encodes it as a data URL', async () => {
    const { token } = await registerAndLogin({
      username: 'avatarUser',
      email: 'avatar@example.com',
    });

    const response = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .field('username', 'avatarUser')
      .field('email', 'avatar@example.com')
      .attach('avatar', Buffer.from('fake-image-bytes'), 'avatar.png');

    expect(response.status).toBe(200);
    expect(response.body.user.avatarUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('changes the password when the current password is verified', async () => {
    const { token } = await registerAndLogin({ username: 'passwordUser', email: 'pw@example.com' });

    const response = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: baseUser.password, newPassword: 'N3wPassword!234' });

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/updated/i);
  });

  it('rejects password changes when the current password is invalid', async () => {
    const { token } = await registerAndLogin({ username: 'deniedUser', email: 'deny@example.com' });

    const response = await request(app)
      .put('/api/users/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'Another$trongPass123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/incorrect/i);
  });
});
