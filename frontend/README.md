# Forecast Dashboard

A [Next.js 16](https://nextjs.org) (App Router) frontend for a sales/demand
forecasting product. It includes a marketing site, authentication pages
(sign in / sign up), and an analytics dashboard with KPI cards, charts, and a
forecast table. The app talks to a Django backend over a small typed API client.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Recharts** for charts, **@tanstack/react-table** for tables
- **Framer Motion** + **@react-three/fiber / three** for animations and visuals
- Package manager: **npm**

---

## 1. Prerequisites

Install these before you start:

- **Node.js 20 or newer** — check with `node -v`. Download from <https://nodejs.org>.
- **npm 10 or newer** (ships with Node) — check with `npm -v`.
- A running **backend API** (Django) if you want live data. Without it the app
  still runs, but API calls will fail. The backend URL is configurable (see below).

---

## 2. Install Dependencies

From the project root, run this once after cloning/unzipping:

```bash
npm install
```

This reads `package.json` / `package-lock.json` and installs everything into
`node_modules`.

---

## 3. Configure Environment Variables

The frontend needs to know where the backend lives. Copy the example file and
edit it:

```bash
cp .env.example .env.local
```

`.env.local`:

```bash
# URL of the Django backend. Defaults to http://127.0.0.1:8000 if omitted.
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

> Any variable that the browser needs must be prefixed with `NEXT_PUBLIC_`.
> `.env.local` is git-ignored and is the right place for your local secrets.

---

## 4. Run in Development

Start the dev server with hot reloading:

```bash
npm run dev
```

Then open <http://localhost:3000> in your browser. Edits to files reload
automatically.

---

## 5. Build & Run in Production

Create an optimized production build:

```bash
npm run build
```

Then start the production server (serves the build from step above):

```bash
npm run start
```

By default it serves on <http://localhost:3000>. To use a different port:

```bash
npm run start -- -p 8080
```

Make sure `NEXT_PUBLIC_API_BASE_URL` points at your **production** backend when
you build, since `NEXT_PUBLIC_` values are baked in at build time.

---

## 6. Lint

```bash
npm run lint
```

---

## Available Scripts

| Command         | What it does                                          |
| --------------- | ----------------------------------------------------- |
| `npm run dev`   | Start the development server (hot reload) on port 3000 |
| `npm run build` | Create an optimized production build                  |
| `npm run start` | Run the production server (requires a prior build)    |
| `npm run lint`  | Run ESLint over the project                           |

---

## Project Structure

```
app/
  (public)/        Marketing site, sign in, and sign up pages
  dashboard/       Authenticated analytics dashboard
  layout.tsx       Root layout
  globals.css      Tailwind v4 + theme tokens
components/
  auth/            Login / register forms, route guard
  dashboard/       KPI cards, charts, tables, dialogs, sidebar
  marketing/       Hero, navbar, sections, footer, visuals
  ui/              Reusable UI primitives (button, card, input, ...)
lib/
  api/client.ts    Typed fetch wrapper around the backend API
  auth/            Auth context, service, and token helpers
  forecast-data.ts Forecast data helpers
public/            Static assets (icons, images)
```

---

## Deploying

The easiest way to deploy is [Vercel](https://vercel.com). Push the repo, import
the project, and set `NEXT_PUBLIC_API_BASE_URL` in the project's Environment
Variables. Vercel runs `npm install` and `npm run build` automatically.
