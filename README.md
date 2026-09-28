# Demand Forecasting Dashboard

A multi-tenant web app for small retailers. A business registers its products,
records sales through a checkout endpoint, and a machine-learning model predicts
next week's demand per product so the owner knows what to reorder before they
run out.

> **Project status: work in progress.** The domain model and the frontend are in
> good shape; the backend is partly wired and parts of it do not run yet. See
> [Current status](#current-status) before assuming a feature works.

---

## How it works

```
Sales happen        →  Order + OrderLine rows accumulate
                              ↓
RandomForest trains on weekly per-product aggregates
                              ↓
ForecastResult      →  predicted units for the next 7 days
                              ↓
Inventory           →  reorder quantity + stockout risk
                              ↓
EvaluationMetric    →  was the forecast actually right?
```

## Stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Backend    | Django 6.0, Django REST Framework, SimpleJWT                      |
| Database   | PostgreSQL 16 (Docker, port **5433**)                             |
| ML         | scikit-learn `RandomForestRegressor`, pandas, numpy               |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript                     |
| Styling/UI | Tailwind CSS v4, Recharts, Framer Motion, lucide-react            |
| Package mgr| `pip` (backend), `pnpm` (frontend)                                |

---

## Quickstart

### Prerequisites

- Python 3.13+
- Node.js 20+ and pnpm
- Docker (for PostgreSQL)

### 1. Backend

> **Note:** there are two virtualenvs in the workspace root. **`venv/` is the
> working one** — it has Django, DRF and scikit-learn installed. `.venv/` is a
> leftover empty environment and can be deleted.

```bash
# from the workspace root (the folder that contains venv/ and this repo)
venv/Scripts/activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r Demand-Forecasting-Dashboard/backend/requirements.txt
```

Start PostgreSQL on port 5433:

```bash
docker run -d --name demand-forecasting-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=demand_forecasting \
  -p 5433:5432 \
  -v demand_forecasting_data:/var/lib/postgresql/data \
  postgres:16
```

Configure the environment:

```bash
cd Demand-Forecasting-Dashboard
cp backend/.env.example .env      # then edit the values
```

Run the migrations and start the server:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver        # http://127.0.0.1:8000
```

`manage.py` defaults to `config.settings.development`, so no extra environment
variable is needed locally.

### 2. Seed demo data (optional)

The repo ships the Kaggle *Store Item Demand* dataset (913k rows, 2013–2017).
The seeder keeps the first 3 stores and 20 items, producing ~110,000 orders.

> ⚠️ **Destructive.** It deletes all existing `Order`, `Product` and `Business`
> rows first. Only run it on a throwaway database. It also has known bugs — see
> [Known issues](#known-issues).

```bash
python manage.py seed_superstore dataset/train.csv
```

### 3. Frontend

```bash
cd Demand-Forecasting-Dashboard/frontend
pnpm install
cp .env.example .env.local        # points at http://127.0.0.1:8000 by default
pnpm dev                          # http://localhost:3000
```

---

## Project layout

```
Demand-Forecasting-Dashboard/
├── backend/
│   ├── config/
│   │   ├── settings/        base.py (shared) / development.py / production.py
│   │   └── urls.py          all /api/ routes are mounted here
│   ├── core/                TimeStampedModel and shared helpers
│   ├── dataset/             Kaggle train.csv / test.csv
│   └── apps/
│       ├── users/           User, BusinessUser (membership + role + active flag)
│       ├── businesses/      Business
│       ├── products/        Product, StockLog (append-only stock ledger)
│       ├── sales/           Order, OrderLine, checkout, seed command
│       ├── forecasting/     ForecastResult + the RandomForest pipeline
│       ├── inventory/       Inventory read-model for the dashboard
│       └── analytics/       EvaluationMetric (forecast accuracy scorecard)
└── frontend/
    ├── app/                 App Router pages: (public), /dashboard, /onboarding
    ├── components/          marketing/, auth/, dashboard/, onboarding/, ui/
    └── lib/                 api/ (fetch layer), auth/, context/, hooks/, types/
```

**Layering convention:** viewsets handle HTTP, `services.py` holds business
logic, models hold invariants. Not every app follows this yet.

---

## Key concept: how tenancy works

There is no `business` field on `User`. A user can belong to several businesses
through the **`BusinessUser`** join table, which carries the user's `role`
(owner / manager / employee) and an `is_active` flag.

`is_active` means **"this is the workspace I am currently looking at"**. The
intended invariant is *exactly one active membership per user*, and every
business-scoped query resolves the current tenant through it:

```python
business_user = request.user.businessuser_set.filter(is_active=True).first()
business = business_user.business
```

This invariant is enforced only in application code, not by a database
constraint. Any code path that sets `is_active=True` without deactivating the
others silently breaks it.

---

## API

All endpoints are under `/api/` and require a `Bearer` JWT except where noted.

| Method | Endpoint                          | Notes                          |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/user/registration/`         | public                         |
| GET    | `/api/user/me/`                   |                                |
| POST   | `/api/token/`                     | public — returns access+refresh |
| POST   | `/api/token/refresh/`             | public                         |
| GET    | `/api/businesses/`                | memberships of the current user |
| POST   | `/api/businesses/`                | create + become owner          |
| POST   | `/api/businesses/{id}/activate/`  | switch active workspace        |
| GET    | `/api/businesses/me/`             | the active business            |
| —      | `/api/products/…`                 | CRUD + search/low_stock/stock moves — **currently broken** |
| POST   | `/api/sales/checkout/`            | order + lines + stock decrement, atomic |
| GET    | `/api/forecasting/results/`       | optional `?product_id=`        |
| GET    | `/api/inventory/results/`         | **currently broken**           |

`drf-spectacular` is installed and configured as the schema class but is not yet
added to `INSTALLED_APPS`, so there is no `/api/docs/` route.

---

## Current status

| Area                                             | Status                          |
| ------------------------------------------------ | ------------------------------- |
| JWT auth, registration, `/me`                     | ✅ works                        |
| Businesses: list / create / activate / me         | ✅ works                        |
| Sales checkout                                    | ✅ works                        |
| Marketing site, sign-in/up, onboarding, guards    | ✅ works against the real API   |
| Dashboard UI                                      | ⚠️ renders on hardcoded mock data (`lib/forecast-data.ts`) |
| Product endpoints                                 | ❌ broken (see below)           |
| Inventory endpoints                               | ❌ broken, and no rows are ever created |
| ML pipeline                                       | ⚠️ implemented but never invoked |
| Analytics / `EvaluationMetric`                    | ❌ model only, no API           |
| Tests                                             | ❌ none                         |
| OIDC / Google sign-in                             | ❌ scaffolding only             |
| Frontend token refresh                            | ❌ written but never called     |
| CI, Dockerfile, docker-compose                    | ❌ none                         |

---

## Known issues

1. **Product endpoints return 500.** `ProductViewSet` subclasses
   `viewsets.ViewSet` but calls `self.paginate_queryset()`, which only exists on
   `GenericViewSet`. Separately, `create()` passes `business` twice.
2. **Inventory service does not run.** Mismatched annotation names and a
   `@staticmethod` that takes a `cls` argument. Nothing creates `Inventory`
   rows in the first place.
3. **The ML pipeline is never triggered.** `run_prediction_pipeline()` has no
   caller — no scheduler, no management command, no endpoint.
4. **Migration drift.** `Product.stock_keeping_unit` has no migration, and
   `Inventory.status` is still a column in the database after becoming a Python
   property. Run `python manage.py makemigrations` to generate both.
5. **Inconsistent tenant resolution.** `sales` and `forecasting` resolve the
   business with `.first()` instead of `.filter(is_active=True).first()`.
6. **Seeder bugs.** Creates three simultaneously-active memberships, inserts
   businesses with explicit primary keys without advancing the Postgres
   sequence, and guards on the wrong variable (`product` instead of
   `product_obj`).
7. **`EvaluationMetric.absolute_error`** is `max_digits=5, decimal_places=2`,
   which overflows above 999.99.
8. **No test suite.** All `tests.py` files are unmodified Django stubs.

---

## Environments

| Setting               | development                | production                         |
| --------------------- | -------------------------- | ---------------------------------- |
| `DEBUG`               | `True`                     | `False`                            |
| `ALLOWED_HOSTS`       | localhost variants         | required via env, else startup fails |
| CORS                  | all origins allowed        | explicit `CORS_ALLOWED_ORIGINS` allow-list |
| HTTPS/HSTS/secure cookies | off                    | on                                 |

`base.py` is secure-by-default: `DEBUG = False` and CORS denies everything, and
each environment file opts out. Production refuses to start if `SECRET_KEY`,
`ALLOWED_HOSTS` or `CORS_ALLOWED_ORIGINS` are missing.

---

## License

See [LICENSE](LICENSE).
