import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'cardowner',
  email: 'cardowner@example.com',
  password: 'SuperSecurePass1',
};

const registerAndLogin = async () => {
  const response = await request(app).post('/api/auth/register').send(userCredentials);
  return {
    token: response.body.token,
    user: response.body.user,
  };
};

describe('Card API', () => {
  it('creates and lists cards for a list', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Board D' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Column', board: boardId });
    const listId = listRes.body.list.id;

    const c1 = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card 1', list: listId });
    expect(c1.status).toBe(201);

    const c2 = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Card 2', list: listId });
    expect(c2.status).toBe(201);

    const res = await request(app)
      .get(`/api/cards?list=${listId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(2);
    expect(res.body.cards[0].title).toBe('Card 1');
  });

  it('gets, updates (including move) and deletes a card', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Board E' });
    const boardId = boardRes.body.board.id;

    const listA = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A', board: boardId });
    const listB = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'B', board: boardId });
    const listAId = listA.body.list.id;
    const listBId = listB.body.list.id;

    const created = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'MoveMe', list: listAId });
    expect(created.status).toBe(201);
    const cardId = created.body.card.id;

    const getRes = await request(app)
      .get(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.card.title).toBe('MoveMe');

    // move card to list B
    const moveRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ list: listBId });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.card.list).toBe(listBId);

    // update fields
    const updRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Moved and Updated', description: 'desc' });
    expect(updRes.status).toBe(200);
    expect(updRes.body.card.title).toBe('Moved and Updated');

    // delete
    const delRes = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    const fetchAfter = await request(app)
      .get(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetchAfter.status).toBe(404);
  });
});
