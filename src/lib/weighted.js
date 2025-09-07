import Fuse from 'fuse.js';
import { distanceKm } from './geo.js';
import { availabilityOverlapRatio } from './time.js';

const DEFAULT_WEIGHTS = { services:0.3, expertise:0.3, location:0.2, availability:0.2 };

export function weightedMatch(query, nurses){
  const {
    servicesQuery = [], expertiseQuery = [], city, start, end,
    lat, lng, maxDistanceKm = 50, topK = 10, urgent = false,
    weights = DEFAULT_WEIGHTS
  } = query || {};

  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  const pre = (nurses||[]).filter(n => !city || n.city?.toLowerCase() === String(city).toLowerCase());

  const fuseOptions = { includeScore: true, threshold: 0.4 };

  const scored = pre.map(n => {
    // services fuzzy
    let serviceScore = 0;
    if(Array.isArray(servicesQuery) && servicesQuery.length && Array.isArray(n.services)){
      const f = new Fuse(n.services.map(x=>({t:x})), { ...fuseOptions, keys:['t'] });
      const arr = servicesQuery.map(q => {
        const r = f.search(String(q));
        return r.length ? 1 - Math.min(1, r[0].score ?? 1) : 0;
      });
      serviceScore = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    }

    // expertise jaccard
    let expertiseScore = 0;
    if(Array.isArray(expertiseQuery) && expertiseQuery.length && Array.isArray(n.expertiseTags)){
      const rq = new Set(expertiseQuery.map(x=>String(x).toLowerCase()));
      const nt = new Set(n.expertiseTags.map(x=>String(x).toLowerCase()));
      const inter = [...rq].filter(x=>nt.has(x)).length;
      const union = new Set([...rq, ...nt]).size || 1;
      expertiseScore = inter/union;
    }

    // availability
    const avail = (s&&e) ? availabilityOverlapRatio(s,e,n.availability,day) : 1;

    // location
    const dKm = (lat!=null&&lng!=null&&n.lat!=null&&n.lng!=null) ? distanceKm(lat,lng,n.lat,n.lng) : null;
    const location = (dKm==null) ? 0.5 : Math.max(0, 1 - (dKm/(maxDistanceKm||50)));

    let score = (weights.services*serviceScore) + (weights.expertise*expertiseScore) + (weights.availability*avail) + (weights.location*location);

    const hoursToStart = s ? (s - new Date())/36e5 : null;
    const isUrgent = urgent === true || (hoursToStart!=null && hoursToStart < 24);
    if(isUrgent) score *= 1.10;

    score = Math.max(0, Math.min(1, score));

    const reason = [
      serviceScore>0?`services≈${(serviceScore*100)|0}%`:null,
      expertiseScore>0?`expertise≈${(expertiseScore*100)|0}%`:null,
      avail>0?`availability≈${(avail*100)|0}%`:null,
      dKm!=null?`distance≈${dKm.toFixed(1)}km`:null,
      isUrgent?`urgent +10%`:null
    ].filter(Boolean).join(' · ');

    return { id:n.id, name:n.name, city:n.city, score, reason, meta:{ serviceScore, expertiseScore, availabilityRatio:avail, distanceKm:dKm, rating:n.rating, reviewsCount:n.reviewsCount } };
  });

  const sorted = scored.sort((a,b)=> (b.score??0)-(a.score??0) || (b.meta?.rating??0)-(a.meta?.rating??0) || (b.meta?.reviewsCount??0)-(a.meta?.reviewsCount??0));
  return sorted.slice(0, topK);
}
