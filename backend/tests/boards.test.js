import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { Board } from '../src/models/Board.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'boardowner',
  email: 'owner@example.com',
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
      membershipRole: 'owner',
      background: {
        type: 'color',
        value: '#0f172a',
        thumbnail: '',
      },
    });
  });

  it('accepts a background payload during creation', async () => {
    const { token } = await registerAndLogin();

    const response = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Marketing plan',
        background: {
          type: 'image',
          value: 'https://images.test/cover.jpg',
          thumbnail: 'https://images.test/thumb.jpg',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.board.background).toEqual({
      type: 'image',
      value: 'https://images.test/cover.jpg',
      thumbnail: 'https://images.test/thumb.jpg',
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
    expect(response.body.boards[0]).toMatchObject({
      title: 'Project Beta',
      membershipRole: 'owner',
    });
  });

  it('lists boards where the user is a member', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'teammate',
      email: 'teammate@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Shared Roadmap' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const memberBoards = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${member.token}`);

    expect(memberBoards.status).toBe(200);
    expect(memberBoards.body.boards).toHaveLength(1);
    expect(memberBoards.body.boards[0]).toMatchObject({
      title: 'Shared Roadmap',
      membershipRole: 'member',
    });
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
      .send({
        title: 'Project Delta Updated',
        description: 'Updated description',
        background: { type: 'color', value: '#312e81' },
      });

    expect(response.status).toBe(200);
    expect(response.body.board.title).toBe('Project Delta Updated');
    expect(response.body.board.description).toBe('Updated description');
    expect(response.body.board.background.value).toBe('#312e81');
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

describe('Board Permission Levels', () => {
  it('allows admin to update a board', async () => {
    const owner = await registerAndLogin();
    const admin = await registerAndLogin({
      username: 'adminuser',
      email: 'admin@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Admin Test Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: admin.user.id, role: 'admin' } },
    });

    const response = await request(app)
      .patch(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Updated by Admin' });

    expect(response.status).toBe(200);
    expect(response.body.board.title).toBe('Updated by Admin');
  });

  it('allows member to view a board but not update', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'memberuser',
      email: 'member@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Member Test Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    // Member can view
    const viewResponse = await request(app)
      .get(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.body.board.title).toBe('Member Test Board');

    // Member cannot update
    const updateResponse = await request(app)
      .patch(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Should Fail' });

    expect(updateResponse.status).toBe(403);
  });

  it('allows viewer to view a board but not update', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'vieweruser',
      email: 'viewer@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Test Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    // Viewer can view
    const viewResponse = await request(app)
      .get(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.body.board.title).toBe('Viewer Test Board');

    // Viewer cannot update
    const updateResponse = await request(app)
      .patch(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ title: 'Should Fail' });

    expect(updateResponse.status).toBe(403);
  });

  it('prevents viewer from deleting a board', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'viewerdelete',
      email: 'viewerdelete@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'No Delete Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    const deleteResponse = await request(app)
      .delete(`/api/boards/${creation.body.board.id}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(deleteResponse.status).toBe(403);
  });
});
