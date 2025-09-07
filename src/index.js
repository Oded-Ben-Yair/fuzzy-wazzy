import express from 'express';
import { weightedMatch } from './lib/weighted.js';
import { initDb, dbHealth, loadNurses } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5002;

app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/db/health', async (_req, res) => {
  const health = await dbHealth();
  res.json(health);
});

app.post('/match', async (req, res) => {
  const q = req.body || {};
  const nurses = await loadNurses();
  const results = weightedMatch(q, nurses);
  res.json({ count: results.length, results });
});

// Initialize DB on startup
await initDb().catch(e => console.warn('DB init error:', e.message));

app.listen(PORT, () => {
  console.log('Fuzzy Wazzy listening on :' + PORT);
  console.log(`Docs at http://localhost:${PORT}/docs/demo.html`);
});
