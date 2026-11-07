import { neon } from '@neondatabase/serverless';

const COLS = ['games', 'entries', 'config', 'tambola', 'ootd'];
let ready;

function sqlClient() {
  const env = process.env;
  let url = env.DATABASE_URL || env.POSTGRES_URL;
  if (!url) {
    const key = Object.keys(env).find((k) => /(DATABASE|POSTGRES).*URL$/.test(k) && !/(UNPOOLED|NON_POOLING|NO_SSL)/.test(k) && /^postgres/.test(env[k] || ''));
    if (key) url = env[key];
  }
  if (!url) throw new Error('No Neon connection string found in the environment variables (looked for DATABASE_URL)');
  return neon(url);
}

function init(sql) {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS docs (
      col text NOT NULL, id text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}',
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (col, id))`.catch((e) => { ready = null; throw e; });
  }
  return ready;
}

function merge(t, p) {
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!t[k] || typeof t[k] !== 'object') t[k] = {};
      merge(t[k], v);
    } else t[k] = v;
  }
  return t;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sql = sqlClient();
    await init(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT col, id, data FROM docs`;
      const out = {};
      COLS.forEach((c) => (out[c] = {}));
      for (const r of rows) if (out[r.col]) out[r.col][r.id] = r.data;
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') b = JSON.parse(b);
      const { op, col, id, data } = b || {};
      if (!COLS.includes(col) || typeof id !== 'string' || !id || id.length > 200)
        return res.status(400).json({ error: 'bad request' });

      if (op === 'set') {
        const json = JSON.stringify(data || {});
        await sql`INSERT INTO docs (col, id, data) VALUES (${col}, ${id}, ${json}::jsonb)
                  ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      } else if (op === 'update') {
        const rows = await sql`SELECT data FROM docs WHERE col = ${col} AND id = ${id}`;
        const merged = merge(rows[0] ? rows[0].data : {}, data || {});
        const json = JSON.stringify(merged);
        await sql`INSERT INTO docs (col, id, data) VALUES (${col}, ${id}, ${json}::jsonb)
                  ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      } else if (op === 'delete') {
        await sql`DELETE FROM docs WHERE col = ${col} AND id = ${id}`;
      } else return res.status(400).json({ error: 'unknown op' });

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error', detail: String((e && e.message) || e).slice(0, 300) });
  }
}
