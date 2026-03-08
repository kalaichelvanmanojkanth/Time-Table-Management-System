# Time Table Management System

## Prerequisites

- **Node.js** (v16 or later) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Time-Table-Management-System
```

### 2. Install All Dependencies

```bash
# Install root dependencies (concurrently)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Run Backend & Frontend Together

Use the following command from the project root to start both backend and frontend concurrently:

```bash
npx concurrently "node backend/server.js" "npm run dev --prefix frontend"
```

This will start the backend server (on port 5001) and the frontend (on port 5173) simultaneously.

### 3. Configure Environment Variables

The `backend/.env` file is already configured with:

```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@time-table.nsigft4.mongodb.net/?appName=Time-Table
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=30d
```

Update `MONGO_URI` and `JWT_SECRET` as needed.

### 4. Run the Application

From the project root, start both backend and frontend together:

```bash
npm run dev
```

This uses `concurrently` to run both servers at once:

- **Backend API** → http://localhost:5001
- **Frontend** → http://localhost:5173

### 5. Run Individually (Optional)

**Backend only:**

```bash
cd backend
npm run dev
```

**Frontend only:**

```bash
cd frontend
npm run dev
```
