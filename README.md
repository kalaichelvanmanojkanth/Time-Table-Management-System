# Classroom & Resource Management Module

Full MERN feature for managing university classrooms and labs with CRUD operations, filtering, resource tracking, and a React-based admin UI.

## Stack

- Node.js + Express.js API
- MongoDB + Mongoose
- React + Vite frontend

## Project Structure

- `backend/` -> Express API and MongoDB models
- `frontend/` -> React classroom management UI
- `docs/mongodb-database-design.md` -> MongoDB design for the wider timetable system

## Setup

1. Install backend dependencies:
   ```bash
   npm install
   ```
2. Install frontend dependencies:
   ```bash
   npm --prefix frontend install
   ```
3. Create `.env` from `.env.example` and set your MongoDB URI.
4. Start backend and frontend together:
   ```bash
   npm run dev
   ```

Frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:5000`.

## Environment Variables

- `PORT` (default: `5000`)
- `MONGODB_URI` (required)
- `NODE_ENV` (optional, `development` or `production`)

## API Endpoints

Base URL: `/api/classrooms`

- `POST /api/classrooms` -> Create classroom/lab
- `GET /api/classrooms` -> List classrooms (supports filters)
- `GET /api/classrooms/:id` -> Get one classroom by ID
- `PUT /api/classrooms/:id` -> Update classroom
- `DELETE /api/classrooms/:id` -> Delete classroom
- `POST /api/classrooms/ai/chat` -> Classroom AI bot chat endpoint
- `GET /api/health` -> Health check

## Classroom Payload Example

```json
{
  "roomName": "CSE-201",
  "building": "Engineering Block",
  "capacity": 60,
  "type": "classroom",
  "resources": ["projector", "whiteboard"],
  "status": "available"
}
```

## Supported Filters

- `building=Engineering`
- `type=classroom|lab`
- `status=available|maintenance`
- `minCapacity=30`
- `maxCapacity=120`
- `resource=projector`
- `availableOnly=true`
- `page=1`
- `limit=20`

Example:

```http
GET /api/classrooms?building=Engineering&type=lab&minCapacity=25&availableOnly=true
```

## Frontend Features

- Classroom creation and update form
- Filter bar for building, type, status, capacity, and resource
- Availability-focused listing with status badges
- Delete action with confirmation
- Dashboard summary cards for total rooms, available rooms, and labs
- Floating AI bot assistant for natural-language classroom questions

## AI Bot Chat Request Example

```json
{
   "message": "Which labs are available?"
}
```

## Data Rules

- `roomName + building` must be unique.
- `type` is restricted to `classroom` or `lab`.
- `status` is restricted to `available` or `maintenance`.
- `resources` are normalized to lowercase and duplicates are removed.

## Production Build

Build the React client:

```bash
npm run build:client
```

In production mode, the Express server serves `client/dist` directly.
