# HCM Lite

HCM Lite is a React/Vite frontend backed by a single Express API and MongoDB database.

## Project layout

```text
frontend/  React application, Vite configuration, frontend tests
backend/   Express API, MongoDB models/configuration, services, middleware, backend tests
```

## Configuration

Copy `backend/.env.example` to `backend/.env` and configure the MongoDB URI, distinct JWT secrets, and face-encryption key. The backend loads its `.env` by file location, regardless of the shell's working directory. It does not fall back to an in-memory database outside tests.

Required backend variables are `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FACE_ENCRYPTION_KEY`. Include a database name in the URI path, or set `MONGODB_DATABASE`; if both are set, they must match. `PORT` defaults to `5000`, and `FRONTEND_URL` defaults to `http://localhost:5173`. Set `FRONTEND_URL` to the deployed frontend's origin only (scheme and host, with no path). The backend validates configuration before connecting and never logs the MongoDB URI or secret values.

Optional backend variables are `NODE_ENV`, `MONGODB_DATABASE`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `FACE_MATCH_THRESHOLD`, `GEMINI_API_KEY`, `AI_MODEL`, and `AI_TIMEOUT_MS`. `MONGODB_TEST_URI` is only for persistence tests. Defaults for non-secret settings are shown in `backend/.env.example`.

Face attendance requires a separate `FACE_ENCRYPTION_KEY`: generate 32 random bytes and encode them as 64 hexadecimal characters. Keep this key stable and private; losing or rotating it makes existing face templates unreadable and requires re-enrollment. `FACE_MATCH_THRESHOLD` controls the face-descriptor distance (default `0.48`; supported range `0.35`–`0.6`).

The frontend uses Vite. `frontend/.env.example` sets `VITE_API_BASE_URL=/api`; Vite proxies that path to the local backend at `http://localhost:5000`. For a separately hosted frontend, set `VITE_API_BASE_URL` at build time to the backend API's base URL, including `/api` (for example, `https://your-backend.example/api`). The frontend sends credentials for API requests so the existing refresh-token cookie works cross-origin; configure the backend's `FRONTEND_URL` to the exact frontend origin. Never put private credentials or backend secrets in frontend variables.

## Run locally

Install dependencies in each application folder and create the backend environment file:

```powershell
cd backend
Copy-Item .env.example .env
npm install
cd ..\frontend
npm install
```

Edit `backend/.env` with valid local MongoDB connection details and secrets before starting the API. In separate terminals, start both applications:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

The API listens on `PORT` (default `5000`); Vite listens on port `5173`. The frontend uses the `/api` proxy during development.

For production, build the frontend and start the backend:

```powershell
cd frontend
npm run build
cd ..\backend
npm start
```

Deploy `frontend/dist` as static files and run the backend with `npm start`. Configure `VITE_API_BASE_URL` at frontend build time and configure `FRONTEND_URL`, `PORT`, and the required backend secrets in the deployment environment. The backend binds to the configured `PORT`; it does not serve the Vite frontend.

## Tests

Run the frontend tests and backend tests from their respective folders:

```powershell
cd frontend
npm test
cd ..\backend
npm test
```

Without `MONGODB_TEST_URI`, backend route/business tests use an isolated, memory-only test adapter and do not connect to MongoDB or modify existing database records. A successful run without this variable does not verify Atlas availability or persistence.

To run the full backend end-to-end and persistence suite against MongoDB safely, set `MONGODB_TEST_URI` to an Atlas/local cluster connection string with permission to create a database and delete its test records, then run `npm test` in `backend`. The test preloader generates a new, uniquely named `hcm_test_<id>` database (under MongoDB's database-name length limit) for each test worker. It exercises API workflows and verifies CRUD data remains after reconnecting, then removes test records. It never uses the `MONGODB_URI` application database for test writes.

## Security and data

- Keep `backend/.env` out of version control and replace the example JWT values with independently generated secrets.
- Use a MongoDB account with least-privilege access and a network allowlist.
- Admin-only source archive downloads exclude `.env` files, local test data, build output, and dependencies.
- MongoDB is the sole production persistence layer. The in-memory model adapter is enabled only for automated tests.

## Face registration and attendance

Admin and HR users can register an employee from the Employees Directory after the employee has received the notice and consented. Registration takes three clear camera captures and stores only an encrypted face embedding in MongoDB's `face_templates` collection; it does not upload or retain camera images/video. An explicit **Re-enroll** action replaces the template, and **Delete face template** removes it. Both are available to Admin/HR users in the directory.

Employees can choose face-verified check-in/check-out in Attendance. The browser runs the pinned `@vladmandic/face-api` detector and recognition model locally; its model weights are copied from the installed dependency to the ignored `frontend/public/models/` directory by the frontend `predev` and `prebuild` scripts. Face check-in requires a real camera capture, location permission, the configured office geofence, and a server-side match against the employee linked to the authenticated account. The API never trusts a client-supplied `faceVerified` flag. Existing manual web attendance remains available.

Camera and geolocation use require HTTPS outside localhost and explicit browser permission. Face recognition alone does not provide liveness/anti-spoof detection; do not treat it as a standalone authentication factor or deploy it as a high-assurance control without an independently assessed liveness solution and applicable biometric/privacy review.
