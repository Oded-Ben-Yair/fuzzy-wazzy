# fuzzy-wazzy

A fuzzy matching API service for matching nurses based on weighted criteria. Uses Express.js and Fuse.js for intelligent string matching with configurable scoring weights.

## Features

- Weighted multi-factor scoring system
- Fuzzy string matching for services
- Location-based filtering with distance calculations
- Availability time window matching
- Expertise tag matching
- Database support (PostgreSQL/MongoDB) with JSON fallback

## Quick Start

```bash
# Install dependencies
npm install

# Start with JSON data (default)
npm start

# Start with database
USE_DB=true DB_KIND=postgres DATABASE_URL=postgres://... npm start
```

The server runs on port 5002 by default (configurable via PORT env).

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

## Matching Algorithm

The matching engine uses a weighted scoring system:
- Services matching: 30% (fuzzy string matching)
- Expertise matching: 30% (Jaccard similarity)
- Location proximity: 20% (distance-based)
- Availability overlap: 20% (time window matching)
- Urgent requests receive a 10% score boost

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