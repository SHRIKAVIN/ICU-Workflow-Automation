# Deployment Guide — ICU Workflow Automation

This guide covers how to run the project **locally** and how to **deploy** it for production use.

---

## Option 1: Run locally with Docker Compose (easiest)

**Prerequisites:** Docker and Docker Compose installed.

```bash
cd icu-ai-system
docker-compose up --build
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:3001  
- **AI Service:** http://localhost:8000  
- **MongoDB:** localhost:27017  

After the first run, seed the database (run once):

```bash
docker-compose exec backend node utils/seed.js
```

Then open http://localhost:3000 and use **Quick Demo Login** or:
- Doctor: `doctor@test.com` / `123`
- Nurse: `nurse@test.com` / `123`

---

## Option 2: Run locally without Docker

**Prerequisites:** Node.js 18+, Python 3.10+, MongoDB 7+.

### 1. Start MongoDB

- **macOS (Homebrew):** `brew services start mongodb/brew/mongodb-community`
- **Docker:** `docker run -d -p 27017:27017 --name icu-mongo mongo:7`

### 2. Backend

```bash
cd icu-ai-system/backend
npm install
# Optional: copy .env and set MONGO_URI, PORT, JWT_SECRET
npm run seed   # seed DB (once)
npm run dev    # runs on port 3001
```

### 3. AI Service (separate terminal)

```bash
cd icu-ai-system/ai-service
pip3 install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

### 4. Frontend (separate terminal)

```bash
cd icu-ai-system/frontend
npm install
npm run dev    # runs on port 3000
```

### 5. Open the app

Visit **http://localhost:3000**. Use the same demo credentials as above.

---

## Option 3: Production deployment

For a real server (VPS, cloud VM, or container platform).

### Environment variables

| Variable | Where | Description |
|----------|--------|-------------|
| `MONGO_URI` | Backend | MongoDB connection string (e.g. MongoDB Atlas or your server). |
| `JWT_SECRET` | Backend | Strong random secret for JWT (e.g. `openssl rand -base64 32`). |
| `FRONTEND_URL` | Backend | Full frontend URL for CORS/WebSocket (e.g. `https://app.yourdomain.com`). |
| `AI_SERVICE_URL` | Backend | AI service URL (e.g. `http://localhost:8000` if same host, or internal URL). |
| `PORT` | Backend | Backend port (default `3001`). |
| `NEXT_PUBLIC_API_URL` | Frontend (build-time) | Public backend API URL (e.g. `https://api.yourdomain.com`). |
| `NEXT_PUBLIC_WS_URL` | Frontend (build-time) | Public backend URL for WebSockets (same as API in most cases). |

### Production with Docker Compose

1. **MongoDB:** Use a managed MongoDB (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)) or run MongoDB on the same server and set `MONGO_URI` accordingly.

2. **Create a production env file** (e.g. `.env.production` in `icu-ai-system/` or set in your host):

   ```env
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/icu_system
   JWT_SECRET=<generate-a-strong-secret>
   FRONTEND_URL=https://your-frontend-domain.com
   ```

3. **Frontend build URL:** Build the frontend with the correct public API/WS URLs so the browser talks to your backend:

   ```bash
   export NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   export NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
   ```

   Then in `docker-compose.yml` for the `frontend` service, set:

   ```yaml
   environment:
     - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
     - NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
   ```

   Rebuild the frontend image so these are baked into the build.

4. **Run stack:**

   ```bash
   cd icu-ai-system
   docker-compose --env-file .env.production up --build -d
   docker-compose exec backend node utils/seed.js   # if fresh DB
   ```

5. **Reverse proxy (recommended):** Put Nginx or Caddy in front of the app and terminate TLS. Proxy:
   - `https://yourdomain.com` → frontend (port 3000)
   - `https://api.yourdomain.com` → backend (port 3001)

   Then set `FRONTEND_URL` and `NEXT_PUBLIC_*` to match those URLs.

### Production without Docker (VPS)

1. Install **Node.js 18+**, **Python 3.10+**, and **MongoDB** (or use MongoDB Atlas).
2. **Backend:** Set env vars (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `AI_SERVICE_URL`), then run with a process manager (e.g. `pm2 start server.js`).
3. **AI service:** Run with a process manager or systemd (e.g. `uvicorn main:app --host 0.0.0.0 --port 8000`).
4. **Frontend:** Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`, run `npm run build && npm run start` (e.g. with PM2).
5. Use Nginx/Caddy as reverse proxy with HTTPS.

---

## Checklist for a successful run

- [ ] MongoDB is running and reachable at `MONGO_URI`.
- [ ] Backend starts without errors (port 3001).
- [ ] AI service starts without errors (port 8000).
- [ ] Frontend is built and started (port 3000).
- [ ] Database is seeded (`npm run seed` in backend or `docker-compose exec backend node utils/seed.js`).
- [ ] In production: `FRONTEND_URL` and `NEXT_PUBLIC_*` match your real domains; `JWT_SECRET` is strong and secret.

---

## Quick reference — URLs and ports

| Service   | Default URL           | Port |
|----------|------------------------|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend  | http://localhost:3001 | 3001 |
| AI       | http://localhost:8000 | 8000 |
| MongoDB  | mongodb://localhost:27017 | 27017 |
