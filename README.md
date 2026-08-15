Multi-Store Digital Commerce PWA

This repository contains a production-ready MVP for a multi-store digital commerce platform.

Structure

- backend/: Django + DRF backend
- frontend/: React + TypeScript frontend (PWA)
- docker-compose.yml: Development services (postgres, backend, frontend)

Getting started (development)

1. Copy `.env.example` to `.env`. Leave `DATABASE_URL` empty to use the included SQLite database (`backend/db.sqlite3`). The Docker configuration does not start, reset, or create PostgreSQL.
2. Start services:

   docker compose up --build

3. Backend will be available at http://localhost:8000
4. Frontend will be available at http://localhost:3000

Database safety

- `docker-compose.yml` runs only the backend and frontend; it never creates a PostgreSQL container or named database volume.
- With the default SQLite configuration, backend startup safely applies migrations to `backend/db.sqlite3`.
- If you later use PostgreSQL, point `DATABASE_URL` to a dedicated empty database. Do not run migrations against a database whose schema/data must remain untouched.

Next steps

- Scaffold Django project and apps in `backend/`
- Implement custom User model and JWT auth
- Implement Store, Category, Product models and APIs
- Implement file storage abstraction (local + S3)
- Implement frontend storefront and seller dashboard
