import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export { app, server };
