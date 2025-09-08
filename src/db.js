import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { extractServices, extractExpertise, hashToUnit } from './lib/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_DB = (process.env.USE_DB || 'false').toLowerCase() === 'true';
const DB_KIND = (process.env.DB_KIND || 'postgres').toLowerCase();

// Load city centroids
let CITY_CENTROIDS = {};
let centroidDefaultUsed = false;
try {
  const centroidsPath = path.join(__dirname, '..', 'sample_data', 'city_centroids_il.json');
  CITY_CENTROIDS = JSON.parse(fs.readFileSync(centroidsPath, 'utf-8'));
} catch (e) {
  console.warn('City centroids not loaded:', e.message);
}

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

// Helper to get coordinates for a city
function getCityCoords(city) {
  if (!city) return null;
  
  // Try exact match first
  if (CITY_CENTROIDS[city]) {
    return CITY_CENTROIDS[city];
  }
  
  // Try case-insensitive match
  const cityLower = city.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_CENTROIDS)) {
    if (key.toLowerCase() === cityLower) {
      return coords;
    }
  }
  
  // Default fallback
  if (!centroidDefaultUsed) {
    console.log('centroid_default_used');
    centroidDefaultUsed = true;
  }
  return { lat: 31.4118, lng: 35.0818 };
}

// Unified fetch: return array of nurses with same shape as sample_data/nurses.json
export async function loadNurses() {
  if (!USE_DB) {
    // Try CSV first, fallback to JSON
    const csvPath = path.join(__dirname, '..', 'sample_data', 'nurses.csv');
    const jsonPath = path.join(__dirname, '..', 'sample_data', 'nurses.json');
    
    if (fs.existsSync(csvPath)) {
      console.log('Loading nurses from CSV...');
      let csvContent = fs.readFileSync(csvPath, 'utf-8');
      // Remove BOM if present
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
      });
      
      // Group by nurse_id to consolidate records
      const nurseMap = new Map();
      
      for (const record of records) {
        const nurseId = record.nurse_id;
        if (!nurseId) continue;
        
        if (!nurseMap.has(nurseId)) {
          const coords = getCityCoords(record.municipality);
          nurseMap.set(nurseId, {
            id: nurseId,
            name: record.name || record.treatment_type || 'NURSE',
            gender: record.gender || '',
            city: record.municipality || '',
            lat: coords?.lat || 31.4118,
            lng: coords?.lng || 35.0818,
            services: extractServices(record.treatment_type, record.name, record.remarks),
            expertise: extractExpertise(record.mobility, record.status, record.remarks),
            availability: {
              from: record.from_datetime_utc || null,
              to: record.to_datetime_utc || null
            },
            status: record.status || '',
            rating: 4.0 + hashToUnit(nurseId), // Deterministic rating 4.0-5.0
            reviewsCount: Math.floor(50 + hashToUnit(nurseId + '_count') * 150) // Deterministic 50-200
          });
        } else {
          // Merge services and expertise from multiple records
          const nurse = nurseMap.get(nurseId);
          const newServices = extractServices(record.treatment_type, record.name, record.remarks);
          const newExpertise = extractExpertise(record.mobility, record.status, record.remarks);
          
          nurse.services = [...new Set([...nurse.services, ...newServices])];
          nurse.expertise = [...new Set([...nurse.expertise, ...newExpertise])];
        }
      }
      
      console.log(`Loaded ${nurseMap.size} unique nurses from CSV`);
      return Array.from(nurseMap.values());
    }
    
    // Fallback to JSON
    console.log('Loading nurses from JSON...');
    const json = fs.readFileSync(jsonPath, 'utf-8');
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