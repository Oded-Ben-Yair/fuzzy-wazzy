import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_DB = (process.env.USE_DB || 'false').toLowerCase() === 'true';
const DB_KIND = (process.env.DB_KIND || 'postgres').toLowerCase();

// Lazy holders
let pgClient = null;
let mongoClient = null;

export async function initDb() {
  if (!USE_DB) return { ok: false, reason: 'USE_DB=false' };

  if (DB_KIND === 'postgres') {
    const { Client } = await import('pg');
    pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();
    return { ok: true, kind: 'postgres' };
  } else if (DB_KIND === 'mongo') {
    const { MongoClient } = await import('mongodb');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    return { ok: true, kind: 'mongo' };
  } else {
    throw new Error(`Unsupported DB_KIND: ${DB_KIND}`);
  }
}

export async function dbHealth() {
  if (!USE_DB) return { ok: false, reason: 'USE_DB=false' };
  try {
    if (DB_KIND === 'postgres') {
      const r = await pgClient.query('select 1 as ok');
      return { ok: true, probe: r.rows[0] };
    } else {
      const admin = mongoClient.db(process.env.MONGODB_DB || 'wondercare').admin();
      const info = await admin.ping();
      return { ok: true, probe: info };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Unified fetch: return array of nurses with same shape as sample_data/nurses.json
export async function loadNurses() {
  if (!USE_DB) {
    const json = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'nurses.json'), 'utf-8');
    return JSON.parse(json);
  }
  if (DB_KIND === 'postgres') {
    // Expect tables nurses, nurse_services, nurse_expertise, nurse_availability (see docs/DB_SETUP.md)
    const { rows } = await pgClient.query(`
      select n.id, n.name, n.city, n.lat, n.lng, n.rating, n.reviews_count,
             s.services, e.expertise, a.availability
      from nurses n
      left join (
        select nurse_id, array_agg(service order by service) as services
        from nurse_services group by nurse_id
      ) s on s.nurse_id = n.id
      left join (
        select nurse_id, array_agg(tag order by tag) as expertise
        from nurse_expertise group by nurse_id
      ) e on e.nurse_id = n.id
      left join (
        select nurse_id, json_agg(json_build_object('day', day, 'slots', slots) order by day) as availability
        from nurse_availability group by nurse_id
      ) a on a.nurse_id = n.id
    `);
    return rows.map(r => ({
      id: r.id, name: r.name, city: r.city, lat: Number(r.lat), lng: Number(r.lng),
      rating: Number(r.rating), reviewsCount: Number(r.reviews_count),
      services: r.services || [], expertise: r.expertise || [], availability: r.availability || []
    }));
  } else {
    const db = mongoClient.db(process.env.MONGODB_DB || 'wondercare');
    const docs = await db.collection(process.env.MONGODB_COLLECTION || 'nurses').find({}).toArray();
    return docs.map(d => ({
      id: d.id, name: d.name, city: d.city, lat: d.lat, lng: d.lng,
      rating: d.rating, reviewsCount: d.reviewsCount,
      services: d.services || [], expertise: d.expertise || [], availability: d.availability || []
    }));
  }
}