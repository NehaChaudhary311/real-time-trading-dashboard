import { createHash } from 'crypto';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createAuthRouter } from '../routes/auth.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', createAuthRouter());
  return app;
}

describe('Auth REST routes', () => {
  const app = buildApp();

  // The frontend hashes the password with SHA-256 before sending it
  const VALID_PASSWORD_HASH = createHash('sha256').update('admin').digest('hex');

  describe('POST /api/auth/login', () => {
    it('should return 200 with token and user on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: VALID_PASSWORD_HASH });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: '1',
        username: 'admin',
        displayName: 'Neha Chaudhary',
      });
    });

    it('should set an httpOnly cookie on successful login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: VALID_PASSWORD_HASH });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('token='))
        : (cookies as string);
      expect(tokenCookie).toMatch(/token=/);
      expect(tokenCookie).toMatch(/HttpOnly/i);
    });

    it('should return 401 for wrong username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: VALID_PASSWORD_HASH });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when body is empty', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 and clear the token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('token='))
        : (cookies as string);
      expect(tokenCookie).toMatch(/token=/);
    });
  });
});
