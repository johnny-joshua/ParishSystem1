# Holy Family Parish — Digital Record Management System

**Putiao, Pilar, Sorsogon**

Full-stack application: **React + Tailwind** frontend, **PHP REST API** backend, **MySQL** database.

## Project structure

```
ParishSystem1/
├── client/          # React (Vite) + Tailwind
├── server/          # PHP JSON API (session auth)
├── database/        # MySQL schema & seed
├── auth/            # Legacy server-rendered PHP (optional)
└── ...
```

## Setup

### 1. Database

1. Start XAMPP (Apache + MySQL)
2. Import `database/schema.sql` in phpMyAdmin
3. Run: `php database/seed.php`

**Admin:** `admin@holyfamilyparish.com` / `admin123`

### 2. PHP API

- API base: `http://localhost/ParishSystem1/server/api`
- Configure `server/.env` if needed (DB credentials, CORS)

### 3. React frontend

```bash
cd client
npm install
npm run dev
```

Open: **http://localhost:5173**

The Vite dev server proxies `/api` → `http://localhost/ParishSystem1/server/api` so session cookies work during development.

### Production build

```bash
cd client
npm run build
```

Serve `client/dist` via Apache or copy into your web root. Set `VITE_API_URL=http://localhost/ParishSystem1/server/api` in `.env` if not using the Vite proxy.

## Features

- Register & login (PHP sessions + `withCredentials`)
- Parishioner: reservations, appointments, dashboard
- Admin: approve/reject bookings, centralized records CRUD with search
- Same MySQL database as the plain PHP pages
