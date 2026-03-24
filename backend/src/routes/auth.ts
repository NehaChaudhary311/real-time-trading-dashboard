import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';

const MOCK_USER = {
  id: '1',
  username: 'admin',
  password: 'password',
  displayName: 'Neha Chaudhary',
};

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username !== MOCK_USER.username || password !== MOCK_USER.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: MOCK_USER.id, username: MOCK_USER.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      token,
      user: {
        id: MOCK_USER.id,
        username: MOCK_USER.username,
        displayName: MOCK_USER.displayName,
      },
    });
  });

  return router;
}
