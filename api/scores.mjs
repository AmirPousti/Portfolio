// Leaderboard for the 404 driving game.
// GET  /api/scores            -> { top: [{ name, score }], enabled }
// POST /api/scores            -> { ok, rank, top } with JSON body { name, score, duration }
// DELETE /api/scores?name=... -> { ok } with header x-admin-key (removes a name)
//
// Storage is an Upstash Redis database connected through the Vercel Marketplace,
// reached over its REST API so this file needs no dependencies.

const KEY = 'lost:leaderboard';
const TOP = 10;
const MAX_NAME = 18;

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function cleanName(raw) {
  const name = String(raw || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\p{P} ]/gu, '')   // letters, numbers, punctuation, spaces
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
  return name;
}

// The furthest an honest run can travel in `seconds`, from the game's own speed curve.
function maxDistance(seconds) {
  const s0 = 270, accel = 9, top = 640, ramp = (top - s0) / accel;
  const t = Math.max(0, seconds);
  const px = t <= ramp
    ? s0 * t + 0.5 * accel * t * t
    : s0 * ramp + 0.5 * accel * ramp * ramp + top * (t - ramp);
  return px / 10;
}

async function topScores() {
  const flat = await redis('ZREVRANGE', KEY, 0, TOP - 1, 'WITHSCORES');
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ name: flat[i], score: Number(flat[i + 1]) });
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !token) {
    return res.status(200).json({ enabled: false, top: [] });
  }
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ enabled: true, top: await topScores() });
    }

    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      const hits = await redis('INCR', `lost:rate:${ip}`);
      if (hits === 1) await redis('EXPIRE', `lost:rate:${ip}`, 60);
      if (hits > 8) return res.status(429).json({ error: 'Too many scores in a minute. Have a breather.' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score));
      const duration = Number(body.duration);
      if (!name) return res.status(400).json({ error: 'Pick a name first.' });
      if (!Number.isFinite(score) || score < 10 || score > 200000) return res.status(400).json({ error: 'That score does not look right.' });
      if (!Number.isFinite(duration) || duration <= 0 || duration > 7200 || score > maxDistance(duration) * 1.08 + 10) {
        return res.status(400).json({ error: 'That score does not match the run.' });
      }

      await redis('ZADD', KEY, 'GT', score, name);          // keep each name's best only
      const total = await redis('ZCARD', KEY);
      if (total > 500) await redis('ZREMRANGEBYRANK', KEY, 0, total - 501);
      const rank = await redis('ZREVRANK', KEY, name);
      return res.status(200).json({ ok: true, rank: rank === null ? null : rank + 1, top: await topScores() });
    }

    if (req.method === 'DELETE') {
      const admin = process.env.LEADERBOARD_ADMIN_KEY;
      if (!admin || req.headers['x-admin-key'] !== admin) return res.status(403).json({ error: 'Not allowed.' });
      const name = cleanName(new URL(req.url, 'http://x').searchParams.get('name'));
      const removed = await redis('ZREM', KEY, name);
      return res.status(200).json({ ok: true, removed });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    return res.status(500).json({ error: 'The leaderboard is having a moment. Try again shortly.' });
  }
}
