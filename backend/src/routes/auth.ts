import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';

const MOCK_PASSWORD_SHA256 = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const MOCK_PASSWORD_HASH = bcrypt.hashSync(MOCK_PASSWORD_SHA256, 10);

const MOCK_USER = {
  id: '1',
  username: 'admin',
  passwordHash: MOCK_PASSWORD_HASH,
  displayName: 'Neha Chaudhary',
};

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (username !== MOCK_USER.username) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password ?? '', MOCK_USER.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: MOCK_USER.id, username: MOCK_USER.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    const isSecure = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      token,
      user: {
        id: MOCK_USER.id,
        username: MOCK_USER.username,
        displayName: MOCK_USER.displayName,
      },
    });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  });

  return router;
}
