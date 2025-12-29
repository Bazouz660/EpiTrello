import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { User } from '../src/models/User.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

// Mock the email utility to prevent actual email sending
vi.mock('../src/utils/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true, sent: false }),
}));

setupTestDatabase();

const registerPayload = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'G*9vL!7rQ#5xZp1@',
};

const registerUser = async (payload = registerPayload) => {
  const response = await request(app).post('/api/auth/register').send(payload);
  return response;
};

describe('Authentication API', () => {
  it('registers a new user and returns an access token', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user).toMatchObject({
      username: registerPayload.username,
      email: registerPayload.email,
    });
  });

  it('prevents duplicate registrations', async () => {
    await registerUser();

    const response = await registerUser();

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
  });

  it('rejects registrations with weak passwords', async () => {
    const response = await registerUser({
      username: 'weakling',
      email: 'weak@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/too weak/i);
  });

  it('authenticates an existing user with valid credentials', async () => {
    await registerUser();

    const response = await request(app).post('/api/auth/login').send({
      email: registerPayload.email,
      password: registerPayload.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user.email).toBe(registerPayload.email);
  });

  it('rejects invalid login attempts', async () => {
    await registerUser();

    const response = await request(app).post('/api/auth/login').send({
      email: registerPayload.email,
      password: 'WrongPassword99',
    });

    expect(response.status).toBe(401);
  });

  it('returns the authenticated user profile', async () => {
    const registration = await registerUser();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(registerPayload.email);
  });

  describe('Password Reset', () => {
    it('accepts forgot password request for existing email', async () => {
      await registerUser();

      const response = await request(app).post('/api/auth/forgot-password').send({
        email: registerPayload.email,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/reset link/i);
    });

    it('returns success even for non-existent email (security)', async () => {
      const response = await request(app).post('/api/auth/forgot-password').send({
        email: 'nonexistent@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/reset link/i);
    });

    it('rejects forgot password request without email', async () => {
      const response = await request(app).post('/api/auth/forgot-password').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/email.*required/i);
    });

    it('resets password with valid token', async () => {
      await registerUser();

      // Request password reset
      await request(app).post('/api/auth/forgot-password').send({
        email: registerPayload.email,
      });

      // Get user to find the reset token (in real scenario this comes from email)
      const user = await User.findOne({ email: registerPayload.email });
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeTruthy();

      // We need to create a valid token - simulate what the controller does
      const crypto = await import('node:crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const newPassword = 'N3wP@ssw0rd!Str0ng';
      const response = await request(app).post('/api/auth/reset-password').send({
        token: rawToken,
        password: newPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/reset successful/i);

      // Verify can login with new password
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: registerPayload.email,
        password: newPassword,
      });

      expect(loginResponse.status).toBe(200);
    });

    it('rejects reset with invalid token', async () => {
      const response = await request(app).post('/api/auth/reset-password').send({
        token: 'invalid-token',
        password: 'N3wP@ssw0rd!Str0ng',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid.*expired/i);
    });

    it('rejects reset with expired token', async () => {
      await registerUser();

      const user = await User.findOne({ email: registerPayload.email });
      const crypto = await import('node:crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() - 1000); // Expired
      await user.save();

      const response = await request(app).post('/api/auth/reset-password').send({
        token: rawToken,
        password: 'N3wP@ssw0rd!Str0ng',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid.*expired/i);
    });

    it('rejects reset with weak password', async () => {
      await registerUser();

      const user = await User.findOne({ email: registerPayload.email });
      const crypto = await import('node:crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const response = await request(app).post('/api/auth/reset-password').send({
        token: rawToken,
        password: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/too weak/i);
    });

    it('rejects reset without token or password', async () => {
      const response = await request(app).post('/api/auth/reset-password').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/required/i);
    });
  });
});
