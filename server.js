const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.HUB_PASSWORD || 'Caban@26';

// ── Garante que a pasta /data existe (Render usa volume persistente aqui)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Banco de dados SQLite
const DB_PATH = path.join(DATA_DIR, 'cabana.db');
const db = new Database(DB_PATH);

// ── Pragma de performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Criar tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS pj (
    matricula TEXT PRIMARY KEY,
    dados TEXT NOT NULL,
    atualizado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes_key TEXT NOT NULL,
    matricula TEXT NOT NULL,
    dados TEXT NOT NULL,
    atualizado_em TEXT DEFAULT (datetime('now')),
    UNIQUE(mes_key, matricula)
  );

  CREATE TABLE IF NOT EXISTS ferias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL,
    dados TEXT NOT NULL,
    atualizado_em TEXT DEFAULT (datetime('now')),
    UNIQUE(matricula)
  );
`);

// ── Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware simples (verifica header Authorization: Bearer <senha>)
function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '').trim();
  if (token !== PASSWORD) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

// ════════════════════════════════════════════
// ROTAS — PJ
// ════════════════════════════════════════════

// GET /api/pj  → retorna todos os PJs salvos no banco
app.get('/api/pj', auth, (req, res) => {
  const rows = db.prepare('SELECT matricula, dados FROM pj ORDER BY matricula').all();
  const pjs = rows.map(r => JSON.parse(r.dados));
  res.json(pjs);
});

// PUT /api/pj/:matricula  → upsert de um PJ
app.put('/api/pj/:matricula', auth, (req, res) => {
  const { matricula } = req.params;
  const dados = JSON.stringify(req.body);
  db.prepare(`
    INSERT INTO pj (matricula, dados, atualizado_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(matricula) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em
  `).run(matricula, dados);
  res.json({ ok: true });
});

// PUT /api/pj/batch  → upsert de vários PJs de uma vez (seed inicial)
app.put('/api/pj/batch', auth, (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Esperado array' });
  const upsert = db.prepare(`
    INSERT INTO pj (matricula, dados, atualizado_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(matricula) DO NOTHING
  `);
  const insertMany = db.transaction((items) => {
    for (const item of items) upsert.run(item.matricula, JSON.stringify(item));
  });
  insertMany(list);
  res.json({ ok: true, inserted: list.length });
});

// DELETE /api/pj/:matricula  → remove um PJ (raramente usado)
app.delete('/api/pj/:matricula', auth, (req, res) => {
  db.prepare('DELETE FROM pj WHERE matricula = ?').run(req.params.matricula);
  res.json({ ok: true });
});

// ════════════════════════════════════════════
// ROTAS — NF
// ════════════════════════════════════════════

// GET /api/nf  → todos os lançamentos de NF
app.get('/api/nf', auth, (req, res) => {
  const rows = db.prepare('SELECT mes_key, matricula, dados FROM nf').all();
  const result = {};
  rows.forEach(r => {
    if (!result[r.mes_key]) result[r.mes_key] = {};
    result[r.mes_key][r.matricula] = JSON.parse(r.dados);
  });
  res.json(result);
});

// PUT /api/nf/:mesKey/:matricula  → upsert de uma entrada de NF
app.put('/api/nf/:mesKey/:matricula', auth, (req, res) => {
  const { mesKey, matricula } = req.params;
  const dados = JSON.stringify(req.body);
  db.prepare(`
    INSERT INTO nf (mes_key, matricula, dados, atualizado_em)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(mes_key, matricula) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em
  `).run(mesKey, matricula, dados);
  res.json({ ok: true });
});

// ════════════════════════════════════════════
// ROTAS — FÉRIAS
// ════════════════════════════════════════════

// GET /api/ferias  → todos os dados de férias
app.get('/api/ferias', auth, (req, res) => {
  const rows = db.prepare('SELECT matricula, dados FROM ferias').all();
  const result = {};
  rows.forEach(r => { result[r.matricula] = JSON.parse(r.dados); });
  res.json(result);
});

// PUT /api/ferias/:matricula  → upsert de férias de um PJ
app.put('/api/ferias/:matricula', auth, (req, res) => {
  const { matricula } = req.params;
  const dados = JSON.stringify(req.body);
  db.prepare(`
    INSERT INTO ferias (matricula, dados, atualizado_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(matricula) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em
  `).run(matricula, dados);
  res.json({ ok: true });
});

// ════════════════════════════════════════════
// ROTA DE SAÚDE
// ════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: DB_PATH, ts: new Date().toISOString() });
});

// Qualquer outra rota → serve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Cabana Hub RH rodando na porta ${PORT}`);
  console.log(`📁 Banco: ${DB_PATH}`);
});
