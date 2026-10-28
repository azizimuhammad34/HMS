# Hospital Management System (HMS)

Web-based Hospital Management System for a single medium-sized hospital in Pakistan.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- MongoDB + Mongoose
- Zod validation
- bcrypt password hashing
- Database-backed sessions (HttpOnly cookies)

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `MONGODB_URI` — MongoDB connection string
   - `SESSION_SECRET` — at least 32 random characters
   - `SETUP_SECRET` — one-time secret to create the first Super Admin
   - `APP_URL` — e.g. `http://localhost:3000`
3. Start MongoDB locally (standalone is fine for development; a **replica set** is required for multi-document transactions).
4. Run `npm run dev`
5. Open `/setup` once to create the Super Admin (hospital owner). Setup is disabled after the first Super Admin exists.

## Scripts

- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm test` — Vitest (uses MongoDB Memory Server)

## Architecture notes

- Authorization is enforced on the server for every protected API and page.
- Roles: `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `NURSE`
- Dashboard “today” metrics use **Asia/Karachi** calendar days.
- Revenue = completed **payments** received that day (not invoices issued).
- Patient registrations and patient visits are tracked separately.
- Never commit `.env.local` or real credentials.

## Current milestone status

**Done (Phases 1–7):** authentication & RBAC, role dashboards, patient registration (unique IDs / search / profiles), appointments (schedule / reschedule / cancel / check-in), OPD clinical encounters (notes / diagnoses / prescriptions), and IPD (bed board, admit, census with ward occupancy, discharge).

**Next (Phase 8):** billing UI — invoices, payments, and refunds (Invoice / Payment models already exist).

**Later:** nursing, pharmacy, lab, inventory; then reports, hardening, and production deploy.
