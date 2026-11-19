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
LightGBM trains on complete weeks of per-product sales
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
| ML         | LightGBM (quantile regression), pandas, numpy                     |
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
│   ├── core/                TimeStampedModel, tenancy.py (current business), tenant-isolation tests
│   ├── dataset/             Kaggle train.csv / test.csv
│   └── apps/
│       ├── users/           User (+ active_business), BusinessUser (membership + role)
│       ├── businesses/      Business
│       ├── products/        Product, StockLog (append-only stock ledger)
│       ├── sales/           Order, OrderLine, checkout, seed command
│       ├── forecasting/     ForecastResult + the LightGBM pipeline (ml.py)
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

A user can belong to several businesses through the **`BusinessUser`** join
table, which carries the user's `role` (owner / manager / employee).

The workspace the user is currently looking at is **`User.active_business`**, a
single nullable foreign key. Because it is one column, a user can never have two
active workspaces at once. `POST /api/businesses/{id}/activate/` switches it, and
creating a business switches to the new one.

Every business-scoped view resolves the current business in one place,
`core/tenancy.py`:

```python
from core.tenancy import BusinessScopedMixin

class ProductViewSet(BusinessScopedMixin, viewsets.GenericViewSet):
    def list(self, request):
        products = Product.objects.filter(business=self.business)
```

`BusinessScopedMixin` requires an authenticated user and checks that they are
still a member of their `active_business`. If they have none, or were removed
from it, every endpoint answers the same way:

```
403 {"detail": "You have no active business. Create or select one first."}
    (error code: no_active_business)
```

`core/test_tenant_isolation.py` proves that a user of one business cannot read
or change another business's products, sales, imports, forecasts, inventory or
analytics. Add a case there for every new business-scoped endpoint.

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
| GET    | `/api/businesses/me/`             | the active business, or 403 `no_active_business` |
| —      | `/api/products/…`                 | CRUD + search/low_stock/out_of_stock/stock moves |
| POST   | `/api/sales/checkout/`            | order + lines + stock decrement, atomic |
| POST   | `/api/sales/imports/`             | CSV upload (multipart `file`), runs in the background |
| GET    | `/api/sales/imports/{id}/`        | import job progress and row errors |
| GET    | `/api/forecasting/results/`       | latest forecast per product, paginated; optional `?product_id=` |
| POST   | `/api/forecasting/results/run/`   | forecast the active business now |
| GET    | `/api/analytics/summary/` · `timeline/` · `top-products/` | dashboard figures |
| GET    | `/api/inventory/results/`         | empty until inventory rows are generated |

Every endpoint from `/api/products/` down is scoped to the active business.

`drf-spectacular` is installed and configured as the schema class but is not yet
added to `INSTALLED_APPS`, so there is no `/api/docs/` route.

---

## Forecasting model

`apps/forecasting/ml.py` holds the whole model and has no Django imports;
`ForecastingService.run_prediction_pipeline()` only moves data between the
database and it.

- **Weekly, one week ahead.** Daily sales are summed into complete
  Monday–Sunday weeks. The current, unfinished week is left out, and weeks
  without sales count as 0.
- **One LightGBM model for all products.** It learns from sales divided by
  each product's mean over the previous 8 weeks, so slow and fast sellers (and
  different businesses) share one model. Features: lags of 1–4 and 52 weeks,
  4- and 12-week rolling mean and spread, week of year, month.
- **Three quantiles.** The 50th percentile is the forecast; the 10th and
  90th give the 80% interval stored in `lower_bound` / `upper_bound`.
- **Confidence** is `1 − WAPE` for that product over the last 8 held-out
  weeks, clipped to 0–1.
- **Fallback.** Products with under 4 weeks of history, or every product
  when there is too little data to validate the model, get the mean of their
  last weeks, no interval and confidence 0.

### Accuracy

Backtest: trained on everything before the last 8 weeks, then each of those
weeks predicted one week ahead. WAPE = total absolute error / total units sold
(lower is better).

| Data                                   | LightGBM | Old RandomForest | Same as last week |
| -------------------------------------- | -------- | ---------------- | ----------------- |
| Kaggle, 3 stores × 20 items (seeder)   | **5.0%** | 7.8%             | 8.5%              |
| Kaggle, all 10 stores × 50 items       | **5.2%** | 7.5%             | 8.8%              |
| Same 60 series thinned to ~12 units/week | **25.3%** | —              | 34.1%             |

80% interval coverage on the seeder subset is 72%, so the intervals are a
little too narrow. The Kaggle data is synthetic and very regular; expect real
shops to land nearer the thinned row. Reproduce with:

```bash
python manage.py evaluate_forecast --csv dataset/train.csv --stores 3 --items 20
python manage.py evaluate_forecast          # on the sales in the database
```

---

## Current status

| Area                                             | Status                          |
| ------------------------------------------------ | ------------------------------- |
| JWT auth, registration, `/me`                     | ✅ works                        |
| Businesses: list / create / activate / me         | ✅ works                        |
| Sales checkout                                    | ✅ works                        |
| Marketing site, sign-in/up, onboarding, guards    | ✅ works against the real API   |
| Dashboard UI                                      | ✅ reads the API                |
| Product endpoints                                 | ✅ works                        |
| CSV sales import                                  | ✅ works                        |
| Inventory endpoints                               | ⚠️ run, but no rows are ever created |
| ML pipeline                                       | ✅ "Run forecast" button / `POST /api/forecasting/results/run/` |
| Analytics summary / timeline / top products       | ✅ works                        |
| `EvaluationMetric` (forecast accuracy)            | ❌ model only, no API           |
| Tests                                             | ✅ 71 tests incl. tenant isolation |
| OIDC / Google sign-in                             | ❌ scaffolding only             |
| Frontend token refresh                            | ✅ a 401 refreshes once and retries |
| CI, Dockerfile, docker-compose                    | ❌ none                         |

---

## Known issues

1. **Nothing creates `Inventory` rows**, so the inventory endpoints and
   stock-out figures stay empty.
2. **Forecasts only run on demand.** There is no scheduled weekly run and no
   `manage.py run_forecast` command.
3. **Seeder bugs.** Inserts businesses with explicit primary keys without
   advancing the Postgres sequence, guards on the wrong variable (`product`
   instead of `product_obj`), and has a hardcoded admin password.
4. **`EvaluationMetric.absolute_error`** is `max_digits=5, decimal_places=2`,
   which overflows above 999.99.
5. **Roles are not enforced.** An employee can do everything an owner can.
6. **Bare `python manage.py test` fails to import some test modules**, because
   `backend/` and its parent folder both contain an `__init__.py`. Run tests
   with app labels:
   `python manage.py test core apps.users apps.businesses apps.products apps.sales apps.forecasting apps.inventory apps.analytics`

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
