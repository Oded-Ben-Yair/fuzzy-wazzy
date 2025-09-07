# Fuzzy-Wazzy Scoring Verification

## Overview

The Fuzzy-Wazzy service implements a weighted multi-factor scoring system for matching nurses to patient requests. The system combines fuzzy string matching, set similarity, temporal overlap, and geographic distance calculations.

## Scoring Components

### Default Weights
- **Services**: 30% - Fuzzy string matching for requested services
- **Expertise**: 30% - Jaccard similarity for expertise tags
- **Location**: 20% - Distance-based scoring within radius
- **Availability**: 20% - Time window overlap ratio

### Special Modifiers
- **Urgency Boost**: +10% when `urgent=true` or start time < 24 hours

## Scoring Formula

```
Base Score = (0.3 × ServiceScore) + (0.3 × ExpertiseScore) + 
             (0.2 × AvailabilityScore) + (0.2 × LocationScore)

Final Score = Base Score × 1.10 (if urgent)
```

## ASCII Flow Diagram

```
Request → [Parse Query] → [Filter by City]
             ↓
    ┌────────────────────┐
    │  Service Matching  │ → Fuse.js fuzzy search (threshold: 0.4)
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Expertise Matching │ → Jaccard: |A∩B| / |A∪B|
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │Availability Overlap│ → Time window intersection ratio
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Distance Scoring   │ → 1 - (distance / maxDistanceKm)
    └────────────────────┘
             ↓
    [Weighted Sum] → [Urgency Boost?] → [Sort & Rank] → Response
```

## Test Cases Summary

| Case | Service Query | Expertise Query | Distance | Urgent | Key Observations |
|------|--------------|-----------------|----------|--------|------------------|
| A | "Wound Care" (exact) | ["Geriatrics","Pediatrics"] | 30km | Yes | High service match (~99%), mixed expertise (~33%), urgency boost |
| B | "Wound Treatment" (fuzzy) | ["Wound Care"] | 30km | No | Demonstrates fuzzy matching capability, no urgency boost |
| C | "Wound Care" (exact) | ["Geriatrics","Pediatrics"] | 2km | Yes | Tighter radius filters distant candidates, location weight impact |

## Sample Request/Response

### Request (Case A)
```json
{
  "city": "Tel Aviv",
  "servicesQuery": ["Wound Care"],
  "expertiseQuery": ["Geriatrics", "Pediatrics"],
  "start": "2025-07-28T09:00:00Z",
  "end": "2025-07-28T12:00:00Z",
  "lat": 32.0853,
  "lng": 34.7818,
  "maxDistanceKm": 30,
  "urgent": true,
  "topK": 5
}
```

### Response Structure
```json
{
  "count": 3,
  "results": [
    {
      "id": "n1",
      "name": "Nurit Ben-Ami",
      "city": "Tel Aviv",
      "score": 0.88,
      "reason": "services≈99% · expertise≈33% · availability≈100% · distance≈0.0km · urgent +10%",
      "meta": {
        "serviceScore": 0.999,
        "expertiseScore": 0.333,
        "availabilityRatio": 1.0,
        "distanceKm": 0.0,
        "rating": 4.8,
        "reviewsCount": 124
      }
    }
  ]
}
```

## Key Features

1. **Fuzzy Service Matching**: Uses Fuse.js to handle typos and variations (e.g., "Wound Treatment" matches "Wound Care")
2. **Expertise Jaccard**: Measures tag overlap between request and nurse specializations
3. **Availability Windows**: Calculates exact minute-level overlap between requested time and nurse schedules
4. **Haversine Distance**: Accurate geographic distance calculation for location-based filtering
5. **Multi-factor Ranking**: Combines all factors with configurable weights for flexible scoring

## Test Outputs

See the following files for actual test results:
- `docs/run_health.txt` - Health check endpoint
- `docs/run_caseA.json` - Exact service match with urgency
- `docs/run_caseB.json` - Fuzzy service match without urgency
- `docs/run_caseC.json` - Tight distance radius filtering