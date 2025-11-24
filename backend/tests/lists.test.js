import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'listowner',
  email: 'listowner@example.com',
  password: 'SuperSecurePass1',
};

const registerAndLogin = async () => {
  const response = await request(app).post('/api/auth/register').send(userCredentials);
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
