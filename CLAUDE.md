# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Start the server: `npm start` (runs on port 5002 by default, configurable via PORT env)
- Install dependencies: `npm install`

Note: The project currently has a syntax error with JSON import assertions. Use `with { type: 'json' }` instead of `assert { type: 'json' }` for Node.js v22+.

## Architecture

This is a fuzzy matching API service for matching nurses based on weighted criteria. The system uses Express.js and Fuse.js for fuzzy string matching.

### Core Components

**API Server** (`src/index.js`)
- Express server on port 5002
- Endpoints:
  - `GET /health` - Health check
  - `POST /match` - Main matching endpoint accepting query parameters

**Matching Engine** (`src/lib/weighted.js`)
- Implements weighted scoring system with configurable weights
- Default weights: services (30%), expertise (30%), location (20%), availability (20%)
- Scoring factors:
  - Services: Fuzzy string matching using Fuse.js
  - Expertise: Jaccard similarity for tag matching
  - Location: Distance-based scoring with configurable max distance
  - Availability: Time window overlap calculation
  - Urgency: 10% boost for urgent requests or < 24 hours to start

**Utilities**
- `src/lib/geo.js`: Haversine formula for distance calculation
- `src/lib/time.js`: Availability overlap ratio calculation for scheduling

### Data Model

Nurses data structure includes:
- Basic info: id, name, city, lat/lng coordinates
- Services array: List of services offered
- Expertise tags: Skill/specialization tags
- Availability: Per-day time windows
- Rating and review count

Query parameters for `/match`:
- `servicesQuery`, `expertiseQuery`: Arrays for matching
- `city`, `lat`, `lng`, `maxDistanceKm`: Location filtering
- `start`, `end`: Time window for availability
- `urgent`: Boolean flag for priority
- `topK`: Number of results to return
- `weights`: Custom weight configuration