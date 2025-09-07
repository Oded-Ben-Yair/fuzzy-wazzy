# Database Setup Guide

fuzzy-wazzy supports both PostgreSQL and MongoDB as data sources, with JSON fallback when database is disabled.

## Environment Variables

Set these in your `.env` file:

```bash
USE_DB=true              # Enable database (default: false uses JSON)
DB_KIND=postgres         # postgres or mongo
```

### PostgreSQL Configuration

```bash
DATABASE_URL=postgres://user:password@localhost:5432/wondercare
```

### MongoDB Configuration

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=wondercare
MONGODB_COLLECTION=nurses
```

## PostgreSQL Schema

Create the following tables:

```sql
-- Main nurses table
CREATE TABLE nurses (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  rating DECIMAL(3, 2),
  reviews_count INTEGER DEFAULT 0
);

-- Services offered by each nurse
CREATE TABLE nurse_services (
  nurse_id VARCHAR(50) REFERENCES nurses(id) ON DELETE CASCADE,
  service VARCHAR(255),
  PRIMARY KEY (nurse_id, service)
);

-- Expertise tags
CREATE TABLE nurse_expertise (
  nurse_id VARCHAR(50) REFERENCES nurses(id) ON DELETE CASCADE,
  tag VARCHAR(100),
  PRIMARY KEY (nurse_id, tag)
);

-- Availability windows
CREATE TABLE nurse_availability (
  nurse_id VARCHAR(50) REFERENCES nurses(id) ON DELETE CASCADE,
  day VARCHAR(20),
  slots JSONB,
  PRIMARY KEY (nurse_id, day)
);
```

### Sample Seed Data (PostgreSQL)

```sql
-- Insert sample nurse
INSERT INTO nurses (id, name, city, lat, lng, rating, reviews_count)
VALUES ('nurse001', 'Alice Johnson', 'New York', 40.7128, -74.0060, 4.8, 127);

-- Add services
INSERT INTO nurse_services (nurse_id, service) VALUES
('nurse001', 'Post-Surgery Care'),
('nurse001', 'Wound Care'),
('nurse001', 'Medication Management');

-- Add expertise
INSERT INTO nurse_expertise (nurse_id, tag) VALUES
('nurse001', 'surgical'),
('nurse001', 'geriatric'),
('nurse001', 'wound-care');

-- Add availability
INSERT INTO nurse_availability (nurse_id, day, slots) VALUES
('nurse001', 'monday', '["08:00-12:00", "13:00-17:00"]'::jsonb),
('nurse001', 'tuesday', '["09:00-13:00", "14:00-18:00"]'::jsonb);
```

## MongoDB Schema

The MongoDB collection uses a single document per nurse:

```javascript
{
  "id": "nurse001",
  "name": "Alice Johnson",
  "city": "New York",
  "lat": 40.7128,
  "lng": -74.0060,
  "rating": 4.8,
  "reviewsCount": 127,
  "services": [
    "Post-Surgery Care",
    "Wound Care",
    "Medication Management"
  ],
  "expertise": ["surgical", "geriatric", "wound-care"],
  "availability": [
    {
      "day": "monday",
      "slots": ["08:00-12:00", "13:00-17:00"]
    },
    {
      "day": "tuesday", 
      "slots": ["09:00-13:00", "14:00-18:00"]
    }
  ]
}
```

### Sample Seed Script (MongoDB)

```javascript
// In MongoDB shell or script
use wondercare;

db.nurses.insertOne({
  id: "nurse001",
  name: "Alice Johnson",
  city: "New York",
  lat: 40.7128,
  lng: -74.0060,
  rating: 4.8,
  reviewsCount: 127,
  services: [
    "Post-Surgery Care",
    "Wound Care",
    "Medication Management"
  ],
  expertise: ["surgical", "geriatric", "wound-care"],
  availability: [
    {
      day: "monday",
      slots: ["08:00-12:00", "13:00-17:00"]
    },
    {
      day: "tuesday",
      slots: ["09:00-13:00", "14:00-18:00"]
    }
  ]
});
```

## Testing Database Connection

After configuration, test the database connection:

```bash
# Start the server with database enabled
USE_DB=true npm start

# Check database health
curl http://localhost:5002/db/health
```

A successful response looks like:
```json
{
  "ok": true,
  "probe": { "ok": 1 }
}
```

## Migration from JSON

To migrate existing JSON data to the database:

1. Ensure your database is set up with the schema above
2. Use the seed scripts as templates to insert your data
3. The nurse data structure remains identical between JSON and database sources

## Notes

- fuzzy-wazzy is read-only and doesn't write to the database
- Factor scores (services, expertise, availability, location, ratings) are calculated from database content
- When `USE_DB=false`, the system falls back to `sample_data/nurses.json`
- Database errors are logged but won't crash the server during initialization