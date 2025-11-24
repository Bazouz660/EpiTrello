import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'boardowner',
  email: 'owner@example.com',
  password: 'SuperSecurePass1',
};

const registerAndLogin = async () => {
  const response = await request(app).post('/api/auth/register').send(userCredentials);
  return {
    token: response.body.token,
    user: response.body.user,
  };
};

describe('Board API', () => {
  it('requires authentication for board endpoints', async () => {
    const response = await request(app).get('/api/boards');

    expect(response.status).toBe(401);
  });

  it('creates a new board', async () => {
    const { token } = await registerAndLogin();

    const response = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Alpha', description: 'Launch plan' });

    expect(response.status).toBe(201);
    expect(response.body.board).toMatchObject({
      title: 'Project Alpha',
      description: 'Launch plan',
    });
  });

  it('lists boards for the authenticated user', async () => {
    const { token } = await registerAndLogin();

    await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Beta' });

    const response = await request(app).get('/api/boards').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.boards).toHaveLength(1);
    expect(response.body.boards[0].title).toBe('Project Beta');
  });

  it('retrieves a specific board by id', async () => {
    const { token } = await registerAndLogin();

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Gamma' });

    const response = await request(app)
      .get(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.board.title).toBe('Project Gamma');
  });

  it('updates a board when requested by the owner', async () => {
    const { token } = await registerAndLogin();

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Delta' });

    const response = await request(app)
      .patch(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Delta Updated', description: 'Updated description' });

    expect(response.status).toBe(200);
    expect(response.body.board.title).toBe('Project Delta Updated');
    expect(response.body.board.description).toBe('Updated description');
  });

  it('deletes a board when requested by the owner', async () => {
    const { token } = await registerAndLogin();

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Project Epsilon' });

    const deletion = await request(app)
      .delete(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deletion.status).toBe(204);

    const fetchAfterDeletion = await request(app)
      .get(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetchAfterDeletion.status).toBe(404);
  });
});
