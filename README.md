# fuzzy-wazzy

A fuzzy matching API service for matching nurses based on weighted criteria. Uses Express.js and Fuse.js for intelligent string matching with configurable scoring weights.

## Features

- Weighted multi-factor scoring system
- Fuzzy string matching for services
- Location-based filtering with distance calculations
- Availability time window matching
- Expertise tag matching
- Database support (PostgreSQL/MongoDB) with JSON fallback

## Quickstart

```bash
# Install dependencies
npm install

# Start the server (port 5002 by default)
npm start

# Or use the dev script for automatic port cleanup
npm run dev

# Run smoke tests
npm run test:smoke

# View interactive demo
open http://localhost:5002/docs/demo.html
```

### Example API Calls

```bash
# Health check
curl http://localhost:5002/health

# Match nurses in Tel Aviv for wound care
curl -X POST http://localhost:5002/match \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Tel Aviv",
    "servicesQuery": ["Wound Care"],
    "expertiseQuery": ["Geriatrics"],
    "start": "2025-07-28T09:00:00Z",
    "end": "2025-07-28T12:00:00Z",
    "lat": 32.0853,
    "lng": 34.7818,
    "maxDistanceKm": 30,
    "urgent": true,
    "topK": 5
  }'
```

## API Endpoints

- `GET /health` - Health check
- `GET /db/health` - Database health check
- `POST /match` - Main matching endpoint for nurse queries

## Database Integration

fuzzy-wazzy supports reading nurse data from PostgreSQL or MongoDB databases, with automatic fallback to JSON when database is disabled.

### Configuration

Set these environment variables in your `.env` file:

```bash
# Enable database (default: false uses JSON)
USE_DB=true

# Database type: postgres or mongo
DB_KIND=postgres

# PostgreSQL
DATABASE_URL=postgres://user:pass@localhost:5432/wondercare

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=wondercare
MONGODB_COLLECTION=nurses
```

### Setup Instructions

See [docs/DB_SETUP.md](docs/DB_SETUP.md) for:
- Complete database schema
- Sample seed data
- Migration instructions
- Testing database connection

### How It Works

- When `USE_DB=true`, the service reads nurse data from the configured database
- When `USE_DB=false` (default), it uses `sample_data/nurses.json`
- Factor scores (services, expertise, availability, location, ratings) are calculated from database content
- The service is read-only and doesn't write to the database
- Weights and scoring knobs remain in-memory (can be externalized later)

### Testing Database Connection

```bash
# Start with database enabled
USE_DB=true DB_KIND=postgres DATABASE_URL=postgres://... npm start

# Check database health
curl http://localhost:5002/db/health
```

## How Scoring Works

The matching engine uses a weighted scoring system to rank nurses based on multiple factors. Each factor contributes to the final score: services matching (30% weight, using fuzzy string matching), expertise matching (30% weight, using Jaccard similarity for tags), location proximity (20% weight, distance-based scoring), and availability overlap (20% weight, time window matching). Urgent requests receive an additional 10% score boost. For detailed scoring breakdown and verification, see [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Testing

Run the smoke tests to verify the system is working correctly:

```bash
npm run test:smoke
```

This runs three test scenarios that validate different aspects of the matching algorithm:
- Case A: Strong service match with mixed expertise
- Case B: Fuzzy service term to prove fuzzy matching works
- Case C: Same as A but with smaller distance radius to show location weight impact

## Development

```bash
# Install dependencies
npm install

# Run the server
npm start

# View interactive demo
open http://localhost:5002/docs/demo.html
```

## License

MIT