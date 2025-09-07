import express from 'express';
import { weightedMatch } from './lib/weighted.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nurses = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'nurses.json'), 'utf-8'));

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5002;

app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/match', (req, res) => {
  const q = req.body || {};
  const results = weightedMatch(q, nurses);
  res.json({ count: results.length, results });
});

app.listen(PORT, () => {
  console.log('Fuzzy Wazzy listening on :' + PORT);
  console.log(`Docs at http://localhost:${PORT}/docs/demo.html`);
});
