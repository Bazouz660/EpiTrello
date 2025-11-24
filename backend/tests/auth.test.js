import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const registerPayload = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'SuperSecurePass1',
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
});
