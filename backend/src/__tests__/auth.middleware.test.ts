import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { JWT_SECRET } from '../config.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return app;
}

describe('requireAuth middleware', () => {
  const app = buildApp();

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should pass with a valid Bearer token and attach user to req', async () => {
    const token = jwt.sign({ id: '1', username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('1');
    expect(res.body.user.username).toBe('admin');
  });

  it('should return 401 for an expired Bearer token', async () => {
    const token = jwt.sign({ id: '1', username: 'admin' }, JWT_SECRET, { expiresIn: '0s' });

    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should return 401 for a token signed with the wrong secret', async () => {
    const token = jwt.sign({ id: '1', username: 'admin' }, 'wrong-secret');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should return 401 for a malformed Authorization header', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'NotBearer sometoken');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should pass with a valid token cookie', async () => {
    const token = jwt.sign({ id: '1', username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('1');
  });

  it('should prefer cookie over Bearer header when both are present', async () => {
    const cookieToken = jwt.sign({ id: 'cookie-user', username: 'cookie' }, JWT_SECRET);
    const headerToken = jwt.sign({ id: 'header-user', username: 'header' }, JWT_SECRET);

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `token=${cookieToken}`)
      .set('Authorization', `Bearer ${headerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('cookie-user');
  });
});
