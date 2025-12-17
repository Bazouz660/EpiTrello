import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { Board } from '../src/models/Board.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'listowner',
  email: 'listowner@example.com',
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

describe('List API', () => {
  it('creates a list for a board', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Board A' });
    const boardId = boardRes.body.board.id;

    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Todo', board: boardId });

    expect(res.status).toBe(201);
    expect(res.body.list.title).toBe('Todo');
    expect(res.body.list.board).toBe(boardId);
  });

  it('lists lists for a board', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Board B' });
    const boardId = boardRes.body.board.id;

    await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'One', board: boardId });
    await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Two', board: boardId });

    const res = await request(app)
      .get(`/api/lists?board=${boardId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lists).toHaveLength(2);
    expect(res.body.lists[0].title).toBe('One');
  });

  it('gets, updates and deletes a list and cascades card deletion', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Board C' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Backlog', board: boardId });
    const listId = listRes.body.list.id;

    // create a card in the list
    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card A', list: listId });
    expect(cardRes.status).toBe(201);

    // get list
    const getRes = await request(app)
      .get(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.list.title).toBe('Backlog');

    // update list
    const patchRes = await request(app)
      .patch(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Backlog Updated', archived: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.list.title).toBe('Backlog Updated');
    expect(patchRes.body.list.archived).toBe(true);

    // delete list - should delete its cards
    const delRes = await request(app)
      .delete(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    // fetching the card should 404
    const fetchCard = await request(app)
      .get(`/api/cards/${cardRes.body.card.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetchCard.status).toBe(404);
  });
});

describe('List Permission Levels', () => {
  it('allows viewer to read lists but not create', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'listviewer',
      email: 'listviewer@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer List Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    // Owner creates a list
    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Owner List', board: boardId });
    expect(listRes.status).toBe(201);

    // Viewer can read lists
    const readRes = await request(app)
      .get(`/api/lists?board=${boardId}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.lists).toHaveLength(1);

    // Viewer cannot create a list
    const createRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ title: 'Viewer List', board: boardId });
    expect(createRes.status).toBe(403);
  });

  it('prevents viewer from updating a list', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'listviewerupd',
      email: 'listviewerupd@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Update Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    const updateRes = await request(app)
      .patch(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ title: 'Hacked' });

    expect(updateRes.status).toBe(403);
  });

  it('prevents viewer from deleting a list', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'listviewerdel',
      email: 'listviewerdel@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Delete Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Delete List', board: boardId });
    const listId = listRes.body.list.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    const deleteRes = await request(app)
      .delete(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(deleteRes.status).toBe(403);
  });

  it('allows member to create, update and delete lists', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'listmember',
      email: 'listmember@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Member List Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    // Member can create a list
    const createRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Member List', board: boardId });
    expect(createRes.status).toBe(201);
    const listId = createRes.body.list.id;

    // Member can update a list
    const updateRes = await request(app)
      .patch(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Member List Updated' });
    expect(updateRes.status).toBe(200);

    // Member can delete a list
    const deleteRes = await request(app)
      .delete(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(deleteRes.status).toBe(204);
  });
});
