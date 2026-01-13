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

describe('Board Member Management', () => {
  it('allows owner to add a member to a board', async () => {
    const owner = await registerAndLogin();
    const newMember = await registerAndLogin({
      username: 'newmember',
      email: 'newmember@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Team Board' });

    const response = await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: newMember.user.id, role: 'member' });

    expect(response.status).toBe(200);
    expect(response.body.board.members).toHaveLength(1);
    expect(response.body.board.members[0]).toMatchObject({
      user: newMember.user.id,
      role: 'member',
    });
  });

  it('allows admin to add a member to a board', async () => {
    const owner = await registerAndLogin();
    const admin = await registerAndLogin({
      username: 'adminadder',
      email: 'adminadder@example.com',
    });
    const newMember = await registerAndLogin({
      username: 'addedby admin',
      email: 'addedbyadmin@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Admin Add Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: admin.user.id, role: 'admin' } },
    });

    const response = await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ userId: newMember.user.id, role: 'member' });

    expect(response.status).toBe(200);
    expect(response.body.board.members).toHaveLength(2);
  });

  it('prevents member from adding other members', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'cantadd',
      email: 'cantadd@example.com',
    });
    const newMember = await registerAndLogin({
      username: 'wontbeadded',
      email: 'wontbeadded@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Restricted Board' });

    await Board.findByIdAndUpdate(creation.body.board.id, {
      $push: { members: { user: member.user.id, role: 'member' } },
    });

    const response = await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ userId: newMember.user.id, role: 'member' });

    expect(response.status).toBe(403);
  });

  it('prevents adding duplicate members', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'duplicate',
      email: 'duplicate@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Duplicate Check Board' });

    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    const response = await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'admin' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/already a member/i);
  });

  it('prevents adding board owner as a member', async () => {
    const owner = await registerAndLogin();

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Owner Add Test' });

    const response = await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: owner.user.id, role: 'member' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cannot add board owner/i);
  });

  it('allows owner to remove a member from a board', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'removeme',
      email: 'removeme@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Remove Test Board' });

    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    const response = await request(app)
      .delete(`/api/boards/${creation.body.board.id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body.board.members).toHaveLength(0);
  });

  it('prevents admin from removing a member (owner only)', async () => {
    const owner = await registerAndLogin();
    const admin = await registerAndLogin({
      username: 'adminuser',
      email: 'adminuser@example.com',
    });
    const member = await registerAndLogin({
      username: 'membertobe',
      email: 'membertobe@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Admin Remove Test Board' });

    // Add admin to the board
    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: admin.user.id, role: 'admin' });

    // Add member to the board
    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    // Admin tries to remove member - should be forbidden
    const response = await request(app)
      .delete(`/api/boards/${creation.body.board.id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(403);
  });

  it('allows owner to update member role', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'promoteme',
      email: 'promoteme@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Role Update Board' });

    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    const response = await request(app)
      .patch(`/api/boards/${creation.body.board.id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(200);
    expect(response.body.board.members[0].role).toBe('admin');
  });

  it('returns board members list', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'listmember',
      email: 'listmember@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'List Members Board' });

    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    const response = await request(app)
      .get(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(2);
    expect(response.body.members[0].role).toBe('owner');
    expect(response.body.members[1].role).toBe('member');
  });

  it('shows board in member dashboard after being added', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'dashboardmember',
      email: 'dashboardmember@example.com',
    });

    const creation = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Dashboard Test Board' });

    // Board should not be visible to member yet
    const beforeAdd = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${member.token}`);

    expect(beforeAdd.body.boards).toHaveLength(0);

    // Add member to board
    await request(app)
      .post(`/api/boards/${creation.body.board.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    // Board should now be visible to member
    const afterAdd = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${member.token}`);

    expect(afterAdd.body.boards).toHaveLength(1);
    expect(afterAdd.body.boards[0].title).toBe('Dashboard Test Board');
    expect(afterAdd.body.boards[0].membershipRole).toBe('member');
  });
});

describe('Board Activity/History API', () => {
  it('creates activity entry when board is created', async () => {
    const { token, user } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Activity Test Board' });

    expect(boardRes.status).toBe(201);
    const boardId = boardRes.body.board.id;

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.activity).toHaveLength(1);
    expect(activityRes.body.activity[0]).toMatchObject({
      action: 'created',
      entityType: 'board',
      actor: user.id,
      entityTitle: 'Activity Test Board',
    });
  });

  it('tracks board rename in activity', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original Title' });

    const boardId = boardRes.body.board.id;

    await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.activity.length).toBeGreaterThanOrEqual(2);

    const renameActivity = activityRes.body.activity.find(
      (a) => a.action === 'renamed' && a.entityType === 'board',
    );
    expect(renameActivity).toBeDefined();
    expect(renameActivity.entityTitle).toBe('New Title');
    expect(renameActivity.details).toContain('Original Title');
  });

  it('tracks member addition in activity', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'activitymember',
      email: 'activitymember@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Member Activity Board' });

    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(activityRes.status).toBe(200);

    const memberActivity = activityRes.body.activity.find(
      (a) => a.action === 'added member' && a.entityType === 'member',
    );
    expect(memberActivity).toBeDefined();
    expect(memberActivity.entityTitle).toBe('activitymember');
    expect(memberActivity.details).toBe('as member');
  });

  it('tracks member removal in activity', async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin({
      username: 'removemember',
      email: 'removemember@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Remove Member Board' });

    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: 'member' });

    await request(app)
      .delete(`/api/boards/${boardId}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${owner.token}`);

    const removeActivity = activityRes.body.activity.find(
      (a) => a.action === 'removed member' && a.entityType === 'member',
    );
    expect(removeActivity).toBeDefined();
    expect(removeActivity.entityTitle).toBe('removemember');
  });

  it('denies activity access to non-members', async () => {
    const owner = await registerAndLogin();
    const stranger = await registerAndLogin({
      username: 'stranger',
      email: 'stranger@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Private Board' });

    const boardId = boardRes.body.board.id;

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(activityRes.status).toBe(403);
  });

  it('allows viewer to access activity', async () => {
    const owner = await registerAndLogin();
    const viewer = await registerAndLogin({
      username: 'activityviewer',
      email: 'activityviewer@example.com',
    });

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Viewer Activity Board' });

    const boardId = boardRes.body.board.id;

    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: viewer.user.id, role: 'viewer' });

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.activity).toBeDefined();
  });

  it('supports pagination with limit and before parameters', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Pagination Board' });

    const boardId = boardRes.body.board.id;

    // Perform multiple updates to generate activity
    for (let i = 0; i < 5; i++) {
      await request(app)
        .patch(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: `Description ${i}` });
    }

    // Get first page with limit
    const firstPage = await request(app)
      .get(`/api/boards/${boardId}/activity?limit=3`)
      .set('Authorization', `Bearer ${token}`);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.activity.length).toBe(3);

    // Get next page using before parameter
    const oldestTimestamp = firstPage.body.activity[2].createdAt;
    const secondPage = await request(app)
      .get(`/api/boards/${boardId}/activity?limit=3&before=${oldestTimestamp}`)
      .set('Authorization', `Bearer ${token}`);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.activity.length).toBeGreaterThan(0);

    // Ensure no overlap
    const firstPageIds = firstPage.body.activity.map((a) => a.id);
    const secondPageIds = secondPage.body.activity.map((a) => a.id);
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('returns activity sorted by createdAt descending', async () => {
    const { token } = await registerAndLogin();

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sort Test Board' });

    const boardId = boardRes.body.board.id;

    await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    const activityRes = await request(app)
      .get(`/api/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`);

    const timestamps = activityRes.body.activity.map((a) => new Date(a.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
    }
  });
});
