#!/usr/bin/env bash
set -euo pipefail

# CSV smoke tests with 10 deep scenarios
BASE=${BASE:-http://localhost:5002}
DOCS_DIR="$(dirname "$0")/../docs"
mkdir -p "$DOCS_DIR"

echo "Running CSV smoke tests against $BASE"
echo "========================================="

# Helper function to measure time and make request
make_request() {
    local scenario=$1
    local city=$2
    local payload=$3
    local output_file="$DOCS_DIR/csv_case_${scenario}.json"
    
    echo -n "Scenario $scenario ($city): "
    
    # Measure time in milliseconds
    local start=$(date +%s%3N)
    
    # Make the request
    local response=$(curl -s -X POST "$BASE/match" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    local end=$(date +%s%3N)
    local latency=$((end - start))
    
    # Save response
    echo "$response" > "$output_file"
    
    # Parse response
    local count=$(echo "$response" | jq -r '.count // 0')
    local top1_id=$(echo "$response" | jq -r '.results[0].id // "none"')
    local top1_score=$(echo "$response" | jq -r '.results[0].score // 0')
    
    echo "count=$count, top1=$top1_id (score=$top1_score), latency=${latency}ms"
    
    # Validate schema
    local valid_schema=$(echo "$response" | jq -e '.results | type == "array" and all(has("id") and has("score"))' 2>/dev/null && echo "yes" || echo "no")
    
    # Store metadata (ensure no newlines)
    valid_schema=$(echo "$valid_schema" | tr -d '\n')
    echo "{\"scenario\":\"$scenario\",\"city\":\"$city\",\"count\":$count,\"top1_id\":\"$top1_id\",\"top1_score\":$top1_score,\"latency\":$latency,\"valid_schema\":\"$valid_schema\"}" >> "$DOCS_DIR/csv_results_meta.jsonl"
}

# Clear previous meta file
rm -f "$DOCS_DIR/csv_results_meta.jsonl"

# Scenario A: Tel Aviv wound care search
make_request "A" "Tel Aviv-Yafo" '{
    "city": "Tel Aviv-Yafo",
    "servicesQuery": ["wound care"],
    "expertiseQuery": [],
    "maxDistanceKm": 25,
    "topK": 5
}'

# Scenario B: Haifa medication with urgency
make_request "B" "Haifa" '{
    "city": "Haifa",
    "servicesQuery": ["medication"],
    "expertiseQuery": [],
    "urgent": true,
    "maxDistanceKm": 40,
    "topK": 10
}'

# Scenario C: Ramat-Gan pediatrics with time window
make_request "C" "Ramat-Gan" '{
    "city": "Ramat-Gan",
    "servicesQuery": ["pediatrics"],
    "expertiseQuery": [],
    "start": "2025-09-10T09:00:00Z",
    "end": "2025-09-10T12:00:00Z",
    "maxDistanceKm": 20,
    "topK": 5
}'

# Scenario D: Bat-Yam default/general services
make_request "D" "Bat-Yam" '{
    "city": "Bat-Yam",
    "servicesQuery": ["general"],
    "expertiseQuery": [],
    "maxDistanceKm": 15,
    "topK": 10
}'

# Scenario E: Kiryat Tivon day/night services
make_request "E" "Kiryat Tivon" '{
    "city": "Kiryat Tivon",
    "servicesQuery": ["day night", "circumcision"],
    "expertiseQuery": [],
    "maxDistanceKm": 60,
    "topK": 8
}'

# Scenario F: Tel Aviv hospital services
make_request "F" "Tel Aviv-Yafo" '{
    "city": "Tel Aviv-Yafo",
    "servicesQuery": ["hospital"],
    "expertiseQuery": [],
    "topK": 3,
    "maxDistanceKm": 10
}'

# Scenario G: Jerusalem home care
make_request "G" "Jerusalem" '{
    "city": "Jerusalem",
    "servicesQuery": ["home care"],
    "expertiseQuery": [],
    "maxDistanceKm": 35,
    "topK": 10
}'

# Scenario H: Tel Aviv typo test (fuzzy tolerance)
make_request "H" "Tel Aviv-Yafo" '{
    "city": "Tel Aviv-Yafo",
    "servicesQuery": ["medicaton"],
    "expertiseQuery": [],
    "maxDistanceKm": 20,
    "topK": 5
}'

# Scenario I: Haifa multi-token search
make_request "I" "Haifa" '{
    "city": "Haifa",
    "servicesQuery": ["wound", "hospital"],
    "expertiseQuery": ["experienced"],
    "maxDistanceKm": 30,
    "topK": 10
}'

# Scenario J: Tel Aviv empty services (generic search)
make_request "J" "Tel Aviv-Yafo" '{
    "city": "Tel Aviv-Yafo",
    "servicesQuery": [],
    "expertiseQuery": [],
    "maxDistanceKm": 15,
    "topK": 10
}'

echo "========================================="
echo "Test Summary:"

# Convert JSONL to JSON array for metadata
echo "[" > "$DOCS_DIR/csv_results_meta.json"
cat "$DOCS_DIR/csv_results_meta.jsonl" | head -n -1 | sed 's/$/,/' >> "$DOCS_DIR/csv_results_meta.json"
tail -n 1 "$DOCS_DIR/csv_results_meta.jsonl" >> "$DOCS_DIR/csv_results_meta.json"
echo "]" >> "$DOCS_DIR/csv_results_meta.json"
rm "$DOCS_DIR/csv_results_meta.jsonl"

# Summary stats
total_scenarios=10
zero_results=$(jq -r '[.[] | select(.count == 0)] | length' "$DOCS_DIR/csv_results_meta.json")
avg_latency=$(jq -r '[.[].latency] | add/length | floor' "$DOCS_DIR/csv_results_meta.json")
all_valid=$(jq -r 'all(.valid_schema == "yes")' "$DOCS_DIR/csv_results_meta.json")

echo "- Total scenarios: $total_scenarios"
echo "- Zero-result scenarios: $zero_results"
echo "- Average latency: ${avg_latency}ms"
echo "- Schema validation: $([ "$all_valid" == "true" ] && echo "PASS" || echo "FAIL")"
echo ""
echo "Results saved to:"
echo "- Individual: $DOCS_DIR/csv_case_*.json"
echo "- Metadata: $DOCS_DIR/csv_results_meta.json"