# HCM Lite

HCM Lite is a full-stack Human Capital Management (HCM) system built as a monorepo with a React frontend and an Express/MongoDB backend. It covers employee management, attendance tracking, leave requests, payroll, analytics, AI-driven HR assistance, announcements, audit trails, and face-based attendance workflows.

## Overview

This project is designed for organizations that need a lightweight but feature-rich internal HR platform. The frontend provides a role-based dashboard for Admin, HR, and Employee users, while the backend exposes secure APIs and manages persistence, authentication, and business logic.

## Key Features

- Employee management and directory
- Role-based dashboards for Admin, HR, and employees
- Attendance tracking and face recognition enrollment
- Leave management
- Payroll processing and reporting
- Organization settings and configuration
- Internal announcements and communication
- AI-powered assistant for HR queries
- Audit logs and operational visibility
- Secure authentication with JWT and cookies
- MongoDB-backed persistence and structured API services

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Face API integration for biometric attendance

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Zod validation
- Cookie-based refresh/session handling
- Gemini AI integration (optional)

## Repository Structure

```text
HCM-Lite/
├── backend/                  # Express API server and business logic
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/                 # React + Vite dashboard app
│   ├── src/
│   ├── public/
│   ├── scripts/
│   ├── package.json
│   ├── .env.example
│   └── vite.config.js
├── README.md                 # Project overview and setup guide
└── .gitignore
```

## Prerequisites

Before running the project, make sure you have the following installed:

- Node.js 18+
- npm
- MongoDB instance or MongoDB Atlas connection
- A browser for local frontend development

## Environment Setup

### 1) Backend environment

Create the backend environment file:

```bash
cd backend
cp .env.example .env
```

Then update the values in `backend/.env` with your local or cloud configuration. The required variables include:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FACE_ENCRYPTION_KEY`
- `FRONTEND_URL`

For more details, review the values defined in `backend/.env.example`.

### 2) Frontend environment

Create the frontend environment file:

```bash
cd frontend
cp .env.example .env
```

Update the API URL if needed:

- `VITE_API_BASE_URL=http://localhost:5000/api`

## Local Development

Open two terminals and run the following:

### Terminal 1: Backend

```bash
cd backend
npm install
npm run dev
```

### Terminal 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will run as:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Production Build Check

To verify the frontend build:

```bash
cd frontend
npm run build
```

This generates the production bundle in `frontend/dist`.

## Testing

Run tests separately for each app:

```bash
cd frontend
npm test

cd ../backend
npm test
```

The backend supports an isolated in-memory test mode when `MONGODB_TEST_URI` is not set, which allows route/business tests to run without connecting to a live MongoDB instance.

## Deployment Notes

The project is structured for deployment as two separate Vercel projects:

- Backend project root: `backend`
- Frontend project root: `frontend`

Use the backend environment variables required for production, including MongoDB, JWT secrets, frontend origin, and optional AI config. For the frontend, set `VITE_API_BASE_URL` to the live backend API URL ending in `/api`.

## Security Considerations

- Keep `.env` files private and never commit them to version control.
- Use strong and unique JWT secrets.
- Protect MongoDB connections with least-privilege credentials.
- Keep face encryption keys secure and stable; rotating them will make existing biometric templates unreadable.
- Only expose public frontend values in `VITE_API_BASE_URL`.

## Contributing

1. Create a feature branch.
2. Make your changes in the relevant backend or frontend folder.
3. Run the related tests.
4. Submit a pull request with a clear summary of the updates.

## License

This project is intended for internal business use and may require a separate licensing or usage policy depending on your organization.

## Summary

HCM Lite is a practical HR management system that brings together employee administration, attendance intelligence, leave tracking, payroll, analytics, and AI-assisted operations into a single modern platform.
