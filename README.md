# GameSurge: Real-Time Game Price Intelligence Platform

GameSurge is a high-fidelity, full-stack pricing intelligence dashboard designed for gamers. It aggregates real-time market deals across multiple digital distribution platforms (Steam, Epic Games Store, GOG, Fanatical, etc.), performs moving average pricing volatility calculations, and alerts users of active **Price Surges** or **Value Recoveries**.

The application utilizes a **"Lazy / Hybrid" Watchlist Architecture** where users can track deals instantly as an anonymous guest (saved in `localStorage`) and seamlessly synchronize their alerts persistently with a cloud PostgreSQL database upon logging in with **Discord OAuth2**.

---

## Key Features

1. **Lazy watchlisting**: Add pricing targets instantly without signing up.
2. **Discord OAuth2 Syncing**: Synchronize local guest watchlists silently with database tables upon login via a secure **Implicit Grant Flow**.
3. **Cryptographic Session Security**: Session tokens are cryptographically signed using **HMAC-SHA256** to prevent session spoofing and broken authentication.
4. **Price Analytics Engine**: Displays 14-day Weighted Moving Averages (WMA) and historical price grids.
5. **Market Pulse Alerts**: Automatically flags games currently experiencing active **Price Surges** or **Price Drops (Recoveries)**.
6. **Smart Store Redirection**: The watchlist fallback system guarantees valid store redirection links for purchases, automatically defaulting to the first available platform deal if direct store name matching fails.
7. **Dynamic Multi-Currency Engine**: Conversions are fully dynamic and targets are normalized to USD in the backend to ensure zero double-conversion rounding issues.
8. **Command Palette**: Search the entire catalog globally using keyboard shortcuts (`Ctrl+K` or `Cmd+K`).

---

## Technical Stack

- **Frontend**: React (Vite), Tailwind CSS v4, Lucide Icons, Recharts (Responsive Line/Bar Analytics).
- **Backend**: FastAPI (Python), AsyncPG (High-performance PostgreSQL interface), Uvicorn.
- **Database**: PostgreSQL (Structured schemas for games, price logs, users, and watchlists).
- **External APIs**: CheapShark API (Store deal aggregations) & Steam Web API (Game header media).

---

## Getting Started

### Prerequisites

- **PostgreSQL Database** (running locally or in the cloud).
- **Python 3.8+**
- **Node.js 16+** & **npm**

---

### 1. Database Setup

1. Start your local PostgreSQL server.
2. Create a new database named `GameSurge`:
   ```sql
   CREATE DATABASE GameSurge;
   ```
3. The backend server automatically runs schema migrations and seeds catalog data on startup from [schema.sql](backend/schema.sql).

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your local environment configuration file:
   ```bash
   cp .env.example .env
   ```
3. Edit the newly created `.env` file and populate it with your local credentials:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `DISCORD_CLIENT_ID`: Your Discord Developer Application Client ID.
4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   # Or install standard tools:
   pip install fastapi uvicorn asyncpg httpx python-dotenv
   ```
5. Launch the backend Uvicorn development server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload
   ```
   *The server is active at `http://127.0.0.1:8080`.*

---

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm package dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite client development server:
   ```bash
   npm run dev
   ```
   *The storefront is active at `http://localhost:5173`.*

---

### 4. End-to-End Testing (Playwright)

1. Ensure both the backend and frontend development servers (or Docker containers) are running.
2. Navigate to the `e2e` directory:
   ```bash
   cd e2e
   ```
3. Install Playwright and its dependencies:
   ```bash
   npm install
   npx playwright install --with-deps
   ```
4. Run the test suite:
   ```bash
   # Run tests in headless mode
   npm run test
   
   # Run tests in interactive UI mode
   npm run test:ui
   ```

---

## Running with Docker (Recommended)

You can run the entire stack (Database, Backend, and Frontend) using Docker Compose for a consistent, isolated environment.

1. Ensure Docker Desktop is running.
2. From the root directory, run:
   ```bash
   docker compose up -d
   ```
3. The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8080`.
4. To stop the application:
   ```bash
   docker compose down
   ```

---

## Jenkins CI/CD Pipeline

This project includes an automated Continuous Integration (CI) pipeline defined in the `Jenkinsfile`.

When code is pushed to the repository, Jenkins will:
1. **Build** the Backend and Frontend Docker images.
2. **Spin up** a completely isolated, temporary test environment using `docker-compose.ci.yml`.
3. **Seed** the temporary database with test data using `seed_missing.py`.
4. **Run** all 42 Playwright End-to-End tests inside a dedicated testing container.
5. **Tear down** the test environment automatically to keep the workspace clean.
6. **Push** the verified Docker images to Docker Hub (on successful builds).

To run this pipeline locally, you must configure a Jenkins server with Docker installed, and provide a credential named `docker-hub-credentials` containing your Docker Hub username and password.

---

## Discord OAuth2 Configuration

To enable the live cloud synchronization feature:

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it `GameSurge`.
3. Navigate to the **OAuth2** tab.
4. Copy the **Client ID** and add it to your `backend/.env` file under `DISCORD_CLIENT_ID`.
5. Under **Redirects**, add the callback URL:
   `http://localhost:5173/auth/callback`
6. Click **Save Changes**.

*Your live Discord authentication is now operational!*

<!-- Trigger Webhook Test 2 -->
