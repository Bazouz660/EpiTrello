import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { Board } from '../src/models/Board.js';

import { setupTestDatabase } from './helpers/setupTestDatabase.js';

setupTestDatabase();

const userCredentials = {
  username: 'cardowner',
  email: 'cardowner@example.com',
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
    expect(c1.body.card.activity).toHaveLength(1);
    expect(c1.body.card.activity[0].message).toBe('Card created');

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
    expect(getRes.body.card.activity[0].message).toBe('Card created');

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
    expect(updRes.body.card.activity.some((entry) => entry.message === 'Title updated')).toBe(true);

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

describe('Card Permission Levels', () => {
  it('allows viewer to read cards but not create', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'cardviewer',
      email: 'cardviewer@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Card Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    // Owner creates a card
    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Owner Card', list: listId });
    expect(cardRes.status).toBe(201);

    // Viewer can read cards
    const readRes = await request(app)
      .get(`/api/cards?list=${listId}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.cards).toHaveLength(1);

    // Viewer cannot create a card
    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ title: 'Viewer Card', list: listId });
    expect(createRes.status).toBe(403);
  });

  it('prevents viewer from updating a card', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'cardviewerupd',
      email: 'cardviewerupd@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Update Card Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test Card', list: listId });
    const cardId = cardRes.body.card.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    const updateRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ title: 'Hacked' });

    expect(updateRes.status).toBe(403);
  });

  it('prevents viewer from deleting a card', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'cardviewerdel',
      email: 'cardviewerdel@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Delete Card Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Delete Card', list: listId });
    const cardId = cardRes.body.card.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: viewer.user.id, role: 'viewer' } },
    });

    const deleteRes = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(deleteRes.status).toBe(403);
  });

  it('allows member to create, update and delete cards', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'cardmember',
      email: 'cardmember@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Member Card Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Test List', board: boardId });
    const listId = listRes.body.list.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    // Member can create a card
    const createRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Member Card', list: listId });
    expect(createRes.status).toBe(201);
    const cardId = createRes.body.card.id;

    // Member can update a card
    const updateRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Member Card Updated' });
    expect(updateRes.status).toBe(200);

    // Member can delete a card
    const deleteRes = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe('Card Assigned Members', () => {
  it('creates a card with no assigned members by default', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Assignee Board' });
    const boardId = boardRes.body.board.id;

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Assignee List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Card', list: listId });

    expect(cardRes.status).toBe(201);
    expect(cardRes.body.card.assignedMembers).toEqual([]);
  });

  it('assigns members to a card', async () => {
    const owner = await registerAndLogin();
    const member1 = await registerAndLogin({
      username: 'assignee1',
      email: 'assignee1@example.com',
    });
    const member2 = await registerAndLogin({
      username: 'assignee2',
      email: 'assignee2@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Multi Assignee Board' });
    const boardId = boardRes.body.board.id;

    // Add members to board
    await Board.findByIdAndUpdate(boardId, {
      $push: {
        members: [
          { user: member1.user.id, role: 'member' },
          { user: member2.user.id, role: 'member' },
        ],
      },
    });

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Assignee List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Assigned Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Assign multiple members
    const updateRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedMembers: [member1.user.id, member2.user.id] });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.card.assignedMembers).toHaveLength(2);
    expect(updateRes.body.card.assignedMembers).toContain(member1.user.id);
    expect(updateRes.body.card.assignedMembers).toContain(member2.user.id);
    expect(updateRes.body.card.activity.some((a) => a.message === 'Assignees updated')).toBe(true);
  });

  it('removes assigned members from a card', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'removeassignee',
      email: 'removeassignee@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Remove Assignee Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Assign member
    await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedMembers: [member.user.id] });

    // Remove all assignees
    const removeRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedMembers: [] });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.card.assignedMembers).toEqual([]);
  });

  it('allows member to assign themselves to a card', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'selfassign',
      email: 'selfassign@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Self Assign Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Card', list: listId });
    const cardId = cardRes.body.card.id;

    // Member assigns themselves
    const assignRes = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ assignedMembers: [member.user.id] });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.card.assignedMembers).toContain(member.user.id);
  });

  it('returns assigned members when fetching card', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'fetchassignee',
      email: 'fetchassignee@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Fetch Assignee Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Card', list: listId });
    const cardId = cardRes.body.card.id;

    await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedMembers: [member.user.id] });

    // Fetch card and verify assignedMembers
    const getRes = await request(app)
      .get(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.card.assignedMembers).toHaveLength(1);
    expect(getRes.body.card.assignedMembers[0]).toBe(member.user.id);
  });

  it('returns assigned members when listing cards', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'listassignee',
      email: 'listassignee@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List Assignee Board' });
    const boardId = boardRes.body.board.id;

    await Board.findByIdAndUpdate(boardId, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const listRes = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List', board: boardId });
    const listId = listRes.body.list.id;

    const cardRes = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Card', list: listId });
    const cardId = cardRes.body.card.id;

    await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedMembers: [member.user.id] });

    // List cards and verify assignedMembers
    const listCardsRes = await request(app)
      .get(`/api/cards?list=${listId}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(listCardsRes.status).toBe(200);
    expect(listCardsRes.body.cards[0].assignedMembers).toHaveLength(1);
    expect(listCardsRes.body.cards[0].assignedMembers[0]).toBe(member.user.id);
  });
});
