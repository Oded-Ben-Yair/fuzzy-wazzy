#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:5002}
mkdir -p docs

echo "Health:" | tee docs/run_health.txt
curl -s $BASE/health | tee -a docs/run_health.txt
echo

# Case A: Strong service match (Wound Care), mixed expertise
cat > reqA.json <<'JSON'
{
  "city":"Tel Aviv",
  "servicesQuery":["Wound Care"],
  "expertiseQuery":["Geriatrics","Pediatrics"],
  "start":"2025-07-28T09:00:00Z","end":"2025-07-28T12:00:00Z",
  "lat":32.0853,"lng":34.7818,
  "maxDistanceKm":30,"urgent":true,"topK":5
}
JSON
echo "Case A:" | tee docs/run_caseA.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @reqA.json | tee -a docs/run_caseA.json
echo

# Case B: Fuzzy service term (Wound Treatment) to prove fuzzy≈high
cat > reqB.json <<'JSON'
{
  "city":"Tel Aviv",
  "servicesQuery":["Wound Treatment"],
  "expertiseQuery":["Wound Care"],
  "start":"2025-07-28T09:00:00Z","end":"2025-07-28T12:00:00Z",
  "lat":32.0853,"lng":34.7818,
  "maxDistanceKm":30,"urgent":false,"topK":5
}
JSON
echo "Case B:" | tee docs/run_caseB.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @reqB.json | tee -a docs/run_caseB.json
echo

# Case C: Same as A but smaller distance radius to show location weight impact
cat > reqC.json <<'JSON'
{
  "city":"Tel Aviv",
  "servicesQuery":["Wound Care"],
  "expertiseQuery":["Geriatrics","Pediatrics"],
  "start":"2025-07-28T09:00:00Z","end":"2025-07-28T12:00:00Z",
  "lat":32.0853,"lng":34.7818,
  "maxDistanceKm":2,"urgent":true,"topK":5
}
JSON
echo "Case C:" | tee docs/run_caseC.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @reqC.json | tee -a docs/run_caseC.json
echo

rm -f reqA.json reqB.json reqC.json
echo "DONE"