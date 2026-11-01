# SENTINEL Project Context

Evidence basis: current workspace files, tracked Git history, and the checked-in model metrics. This describes the current working tree, including uncommitted changes. There is no saved prior-session memory. Git contains three commits dated 2026-10-11 and 2026-10-13; current uncommitted and untracked files are identified separately in Section 16.

## 1. PROJECT OVERVIEW

**Name:** SENTINEL | AI SECURITY (also described in the README as “Smart Phishing & Malicious URL Detector”).

**Purpose and problem:** SENTINEL is a browser-based tool for checking suspicious URLs and QR-code links. It extracts lexical properties from a URL, applies a trained scikit-learn Random Forest classifier, presents a phishing-risk score and observed URL characteristics, and stores scans in a local SQLite database. In the current working tree the backend also resolves and contacts the submitted URL for a basic HTTP/TLS reachability check. This helps a visitor inspect a link before choosing to open it, but it is not a full reputation or webpage-content analysis service.

**Target users/client:** Intended users are people who want to inspect a suspicious link or QR code. A named customer, institution, or client is **NOT FOUND**. Separate user accounts are **NOT IMPLEMENTED**.

**Implemented features:**
- Single-page React site with Home, URL Scan, QR Scan, History, Model, and fallback 404 screens.
- URL entry and analysis via a trained Random Forest model using 28 URL-derived features.
- QR decoding from a camera or an uploaded image, then analysis through the same URL scan API.
- Display of risk score/level, model confidence, verdict, lexical warning explanations, and current-working-tree network-check fields.
- SQLite scan history, history listing, and clear-history action.
- Public model status/metrics endpoints and a UI page showing the saved evaluation metrics.
- Local Windows launcher (`START_SENTINEL.bat`) and Render blueprint (`render.yaml`).

**Partial, constrained, or inconsistent:** Browser-generated scan identity is a convenience partition, not authentication. Current backend checks the submitted host despite Home/README copy claiming the destination is not opened. QR camera needs browser permission and HTTPS when deployed. No administrator console, authenticated accounts, full website analysis, or reputation feed is implemented.

## 2. OBJECTIVES AND STAKEHOLDERS

**Objectives evidenced by the implementation:**
- Accept and normalize HTTP/HTTPS URLs.
- Estimate phishing risk from URL-string features with a trained model.
- Explain visible lexical warning signs and communicate uncertainty.
- Decode QR links from a camera or image and analyze them without navigating the user's browser to the destination.
- Save, list, and clear scan records.
- Expose training metrics and model/API readiness.

**Stakeholders:**
- **Developer/operator:** can install dependencies, train the model, run the API and frontend, configure deployment variables, and inspect SQLite/model artifacts. A dedicated admin role or admin UI is **NOT IMPLEMENTED**.
- **Visitor/browser user:** can scan URLs, scan QR codes, review results, view history associated with the browser's `X-Sentinel-User` value, and clear that history. This identity is client-controlled and has no sign-in.
- **Client/organization:** **NOT FOUND** in code, README, deployment config, or Git history examined.
- **External services:** UCI Machine Learning Repository is used to retrieve training data; Render hosts the configured API and static site. The current backend contacts target URL hosts for its live check.

There are no distinct enforced application roles. See Section 5.

## 3. TECH STACK

| Layer | Technology | Exact version | Why used / documented rationale |
|---|---|---|---|
| Frontend | React | 19.3.0 resolved in `frontend/package-lock.json`; `latest` in `package.json` | Renders the browser UI. A decision record explaining the choice is **NOT FOUND**. |
| Frontend | React DOM | 19.3.0 resolved; `latest` declared | Mounts React in the browser. Selection rationale **NOT FOUND**. |
| Frontend routing | React Router DOM | 7.18.4 resolved; `^7.1.1` declared | Client-side route mapping. Selection rationale **NOT FOUND**. |
| Frontend bundler/dev server | Vite | 8.3.4 resolved; `latest` declared | Frontend dev server and production build scripts. Selection rationale **NOT FOUND**. |
| React Vite plugin | `@vitejs/plugin-react` | 6.1.2 resolved; `latest` declared | React integration for Vite. Selection rationale **NOT FOUND**. |
| Icons | `lucide-react` | 0.468.0 resolved; `^0.468.0` declared | UI icons. Selection rationale **NOT FOUND**. |
| QR decoding | `html5-qrcode` | 2.3.8 resolved; `^2.3.8` declared | Camera and image QR decoding. Selection rationale **NOT FOUND**. |
| Backend/API | Python | 3.11.9 in Render config; local README requires Python 3.11+ | Runs Flask, feature extraction, and model inference. |
| Backend/API | Flask | 3.1.0 | HTTP API and route handlers. Selection rationale **NOT FOUND**. |
| CORS | Flask-Cors | 5.0.0 | CORS headers for `/api/*`; `FRONTEND_ORIGIN` controls configured origins. |
| WSGI server | gunicorn | 23.0.0 | Render API process (`--workers 2 --threads 4 --timeout 120`). |
| ML/data | scikit-learn | 1.6.0 | Random Forest training, prediction, split, and evaluation. |
| ML/data | pandas | 2.2.3 | Tabular URL-feature frames and CSV loading. |
| ML/data | numpy | 2.2.1 | scikit-learn numerical dependency, explicitly pinned. |
| Model serialization | joblib | 1.4.2 | Saves and loads the model bundle. |
| Dataset client | ucimlrepo | 0.0.7 | Downloads UCI dataset ID 967 during training. |
| Database | Python `sqlite3` / SQLite | Python module version and SQLite engine version **NOT FOUND** | Embedded database stores scan history in `backend/data/sentinel.db`; no DB server or ORM. |
| Authentication | None | NOT IMPLEMENTED | Browser ID header is not authentication; no password or token package is present. |
| Validation | Python standard library (`urllib.parse`, `ipaddress`, `socket`, `ssl`) and browser `URL` | Runtime versions follow Python/Browser | Checks URL schemes/structure, extracts features, resolves host, and makes network requests. No external validator library. |
| External/AI API | UCI PhiUSIIL dataset through ucimlrepo; Python `urllib` for target URL check | `ucimlrepo` 0.0.7; `urllib` follows Python runtime | Training data source and current backend reachability check. No hosted LLM or AI inference API. |
| Testing | Automated test framework | NOT FOUND | No test files or test commands are present in the repository inventory. |
| Hosting | Render Blueprint | Provider version not applicable | `render.yaml` defines a Python web service and static web service. Deployment success is **NOT VERIFIED** here. |
| Local frontend runtime | Node.js | README/launcher require Node.js 20+; exact installed version **NOT FOUND** | Runs npm/Vite. |

The frontend lockfile resolves exact package versions above while `package.json` leaves several dependencies as `latest`; a later install can resolve different versions if the lockfile is not honored. Python dependency versions are pinned in `backend/requirements.txt`.

## 4. ARCHITECTURE

**Folder structure (relevant files, 2–3 levels):**

```text
.
├── README.md
├── PROJECT_CONTEXT.md
├── SENTINEL_SOURCE_FOR_PLAGIARISM.txt  # concatenated source snapshot; not a detector or test suite
├── START_SENTINEL.bat
├── render.yaml
├── .vscode/settings.json               # workspace setting for build-command auto-approval
├── backend/
│   ├── .gitignore
│   ├── app.py
│   ├── requirements.txt
│   ├── data/                         # SQLite database created at runtime; DB ignored by Git
│   └── ml/
│       ├── __init__.py
│       ├── features.py
│       ├── train_model.py
│       └── models/
│           ├── metrics.json
│           └── sentinel_url_model.joblib
└── frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── public/images/
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── styles.css
        └── components/ScanForm.jsx  # present; App.jsx implements current routed scanners
```

There are no test files in the repository. The SQLite database, Python virtual environment, frontend dependencies, and other ignored runtime/build outputs are not source files in the tree above.

**End-to-end request flow:**
1. React Router renders a page in `frontend/src/App.jsx`.
2. URL form normalizes the text in the browser; QR page decodes a camera/image value and requires an explicit HTTP(S) URL.
3. `useScan().analyzeUrl` sends `POST ${API}/api/scan` with JSON `{ "url": ... }` and the client-provided `X-Sentinel-User` header.
4. Flask CORS handles API cross-origin headers; Flask dispatches to `scan_url()`.
5. `normalize_url()` validates basic HTTP(S) structure; `extract_features()` creates the model input.
6. `MODEL_BUNDLE.predict_proba()` estimates phishing probability. `verify_real_url()` resolves the host and makes a `HEAD`, falling back to `GET` when needed.
7. `build_scan_result()` adjusts the probability-based score using reachability and a hostname heuristic; the API inserts the result into SQLite `scans` and returns JSON.
8. React displays the result. History later calls `GET /api/scans`; clearing calls `DELETE /api/scans`.

**Middleware/request chain:** `Flask` app -> `Flask-Cors` configured for `/api/*` -> Flask route -> route-level parsing/validation -> Python service functions and SQLite. No authentication, authorization, rate-limiting, or request-validation middleware is implemented. Frontend routing uses `BrowserRouter`; Render rewrites static-site paths to `index.html`.

**Environment variable names (values intentionally omitted):**
- `FRONTEND_ORIGIN` — backend CORS origin(s); default is `*`.
- `VITE_API_URL` — frontend API base URL; code falls back to `http://localhost:5000`.
- `SENTINEL_TRAIN_ROWS` — maximum sampled training rows; default `50000`.
- `SENTINEL_DATASET_CSV` — optional local CSV input for training.
- `PYTHON_VERSION` — Render runtime declaration (`3.11.9`).
- `.env` is named in `.gitignore`, but no `.env` file/value is included here. No secrets are required by the inspected code.

**Deployment:** `render.yaml` declares `sentinel-ai-security-api` (Python, root `backend`, installs requirements and trains model, Gunicorn start command, `/api/health` health check) and `sentinel-ai-security-web` (static, root `frontend`, npm build, publishes `dist`, SPA rewrite). Its `VITE_API_URL` value differs from the API domain documented in README; the actual configured value is not repeated here. Do not assume deployment currently works without checking the Render service URL.

## 5. ROLES AND ACCESS CONTROL

| Role/identity | Can do | Cannot do / enforcement |
|---|---|---|
| Anonymous visitor | Call the public API, submit URLs, list scans when supplying a user ID, clear records associated with that ID. | There is no server-verified identity. No login, account, or role check exists. |
| Browser partition (`X-Sentinel-User`) | Frontend creates/persists a random ID in localStorage and sends it for scan/history calls. Backend uses it as `user_id`. | Not secret, signed, or authenticated; a caller can choose another value. Missing header on `GET /api/scans` returns all scans; missing header on `DELETE /api/scans` deletes all scans. |
| Developer/operator | Run setup/training/deployment and access server/database files. | No special operator role or admin UI/API is implemented. |

All API endpoints have no role restriction in code. CORS is not an authorization mechanism.

## 6. DATABASE

There is one SQLite table, created by `ensure_db()` in `backend/app.py`. There are no ORM classes, other tables, declared foreign keys, or explicit secondary indexes.

| Table/model | Field | SQLite type | Required | Default | Unique/index | Relations |
|---|---|---|---|---|---|---|
| `scans` | `id` | INTEGER | Yes (primary key) | AUTOINCREMENT | Primary key; unique row identifier | None |
| `scans` | `user_id` | TEXT | Yes (`NOT NULL`) | None | No explicit index/unique constraint | No user table/reference |
| `scans` | `url` | TEXT | Yes (`NOT NULL`) | None | None | None |
| `scans` | `hostname` | TEXT | Yes (`NOT NULL`) | None | None | None |
| `scans` | `risk_level` | TEXT | Yes (`NOT NULL`) | None | None | None |
| `scans` | `risk_score` | INTEGER | Yes (`NOT NULL`) | None | None | None |
| `scans` | `confidence` | INTEGER | Yes (`NOT NULL`) | None | None | None |
| `scans` | `verdict` | TEXT | Yes (`NOT NULL`) | None | None | None |
| `scans` | `model` | TEXT | Yes (`NOT NULL`) | None | None | None |
| `scans` | `reasons` | TEXT | Yes (`NOT NULL`); JSON text produced by application | None | None | None |
| `scans` | `created_at` | TEXT | Yes (`NOT NULL`) | `CURRENT_TIMESTAMP` | None | None |

`id INTEGER PRIMARY KEY AUTOINCREMENT` is SQLite's row identifier and primary-key index. There are no other declared indexes or uniqueness constraints. There are no 1–1, 1–many, or many–many relationships between database models because no related model/table exists. `user_id` is a plain text partition key, not a foreign key.

## 7. API / ROUTES

All routes are public; “role allowed” means no role/authentication check is performed. JSON response descriptions reflect the current code.

| Method | Path | Role allowed | Purpose | Request body/parameters | Response summary |
|---|---|---|---|---|---|
| GET | `/api/health` | Any caller | API/database/model readiness | None | `status`, `database`, `dbPath`, `modelReady`, `model`, `error`; HTTP 200. |
| GET | `/api/model` | Any caller | Model readiness/path status | None | `ready`, `model`, `modelPath`, `modelFileExists`, `error`; HTTP 200 when ready, otherwise 503. |
| POST | `/api/scan` | Any caller | Validate, score, perform current live check, save result | JSON `url` (or form `url`); optional identity header `X-Sentinel-User` | `{ "scan": {url, hostname, riskScore, riskLevel, confidence, model, verdict, reasons, realCheck, id, createdAt}, "status":"ok" }`; invalid URL 400, inference/runtime error 503. |
| GET | `/api/scans` | Any caller | List recent scan rows | Query `limit` (default 20; clamped 1–200); optional `X-Sentinel-User` | `{ "scans": [...] }`, newest ID first; with header filters by `user_id`, without header lists all users' rows. |
| DELETE | `/api/scans` | Any caller | Clear history | Optional `X-Sentinel-User` | `{ "deleted": true }`; with header deletes matching partition, without header deletes all rows. |
| GET | `/api/model-info` | Any caller | Read saved model metrics | None | Metrics JSON merged from `metrics.json` and loaded model metadata; 503 with `{ "error": ... }` if unavailable. |

The API is implemented in `backend/app.py`; the frontend base URL comes from `VITE_API_URL` in `frontend/src/App.jsx`.

## 8. MODULES

**URL scanning and result calculation**
- Files: `frontend/src/App.jsx`, `backend/app.py`, `backend/ml/features.py`.
- Browser accepts up to 2048 characters in the URL input, prepends `https://` if no scheme is typed, parses with `new URL`, and requires HTTP(S) plus a hostname containing a dot. API independently trims input, prepends `https://` if no `://`, and accepts only HTTP(S) with a nonempty netloc.
- Backend extracts 28 features, calls model `predict_proba`, computes a phishing probability, explains lexical warnings, performs the current DNS/HTTP check, adjusts risk, inserts the record, and returns it.
- Score rules: start with rounded phishing probability × 100, clamped 0–100. If DNS, reachability, and `tlsValid` are all true, subtract 35 with floor 0. If `is_clean_public_domain(hostname)` is true and no listed sensitive term occurs in the hostname, cap at 25. If DNS or reachability is false, floor at 60. `score_to_risk`: `>=70` HIGH, `>=30` MODERATE, otherwise LOW.
- Confidence is rounded highest class probability × 100. Verdict thresholds use the resulting risk score.
- Edge cases: missing/empty URL returns 400; API errors during model/network/scoring return 503; client checks HTTP errors and displays an error. Request IDs in `useScan` prevent stale responses from replacing newer results.

**QR scanning**
- Files: `frontend/src/App.jsx`, `html5-qrcode` dependency.
- Camera path asks `Html5Qrcode` to use the environment-facing camera at 10 FPS with a 230×230 QR box. It stops/clears the scanner on close/unmount. The decoded value must parse as an explicit HTTP(S) URL; it is sent to the shared `useScan` request path.
- Image path uses `scanFile(file, true)`, parses decoded text, requires HTTP(S), reports read/validation errors, clears the scanner, and resets the busy state. File input advertises `image/*` but has no explicit size limit.
- Camera denial/unavailability produces a message suggesting permission or image upload. Deployed camera access requires HTTPS per README.

**History**
- Files: `frontend/src/App.jsx`, `backend/app.py`, SQLite table `scans`.
- Page loads 100 records with the browser identity header, calculates total/low/high counts, renders rows, supports refresh, and confirms before clear.
- API limit accepts integer values, defaults invalid text to 20, then clamps to 1–200. History ordering is descending `id`. If no identity header is sent, list/clear is global, not private.

**Model training and metrics**
- Files: `backend/ml/train_model.py`, `backend/ml/features.py`, `backend/ml/models/sentinel_url_model.joblib`, `backend/ml/models/metrics.json`.
- Reads `SENTINEL_DATASET_CSV` if it points to an existing CSV with URL and label/status/result/target columns; otherwise fetches UCI repository dataset 967 via `ucimlrepo`.
- Drops blank rows, strips URLs, keeps lengths 4–2048, removes duplicate URLs. Maps UCI numeric label 0 to phishing target 1 and label 1 to legitimate target 0. Recognized text labels are mapped in code. A stratified sample is limited to `SENTINEL_TRAIN_ROWS` (default 50,000), then split 80/20 with `random_state=42`.
- Trains `RandomForestClassifier(n_estimators=120, max_depth=24, min_samples_leaf=2, class_weight="balanced_subsample", n_jobs=2, random_state=42)`; writes a compressed joblib bundle and JSON metrics.
- Current checked-in `metrics.json` reports 50,000 rows, 40,000 train / 10,000 test, 28 features, accuracy 0.9953, precision 0.9983, recall 0.9906, F1 0.9945, ROC AUC 0.9982, and confusion matrix `[[5722, 7], [40, 4231]]`. These are the artifact's reported held-out-split metrics, not a guarantee of real-world accuracy.

**Model/status pages and deployment**
- Files: `backend/app.py`, `frontend/src/App.jsx`, `render.yaml`, `START_SENTINEL.bat`.
- `load_model()` loads joblib at API import/start. `/api/health`, `/api/model`, and `/api/model-info` expose runtime/metrics data. `ModelPage` fetches and displays metrics, dataset source, and confusion matrix.
- Local launcher checks `py` and `node`, creates backend venv if absent, installs Python requirements, trains if model file is missing, installs npm dependencies if `node_modules` is missing, and opens API/frontend terminals.

## 9. KEY FLOWS (FOR DIAGRAMS)

**Login/authentication:** NOT IMPLEMENTED. No login route, credential storage, JWT, session service, or role branch exists.

**URL scan:**
1. Browser visitor -> `UrlScanPage` -> enter URL and submit -> browser parses URL and applies HTTP(S)/hostname checks.
2. Browser -> `useScan.analyzeUrl` -> sends `POST /api/scan` with URL and `X-Sentinel-User` -> network/JSON error sets UI error and stops.
3. Flask -> `scan_url` -> reads JSON/form URL -> `normalize_url`; missing/invalid scheme/netloc -> HTTP 400.
4. Flask -> `build_scan_result` -> missing model -> runtime failure -> HTTP 503; otherwise extracts features and predicts class probabilities.
5. Flask -> `verify_real_url` -> missing hostname or DNS failure leaves check unsuccessful; success triggers HEAD, exception triggers GET fallback; network errors populate check error.
6. Flask -> score logic -> adjusts probability score, selects LOW/MODERATE/HIGH and verdict, creates explanation list.
7. Flask -> SQLite -> inserts `scans` row with user header value or `anonymous`; inference/build exceptions are caught as HTTP 503. Database-write exceptions are not caught by a route-level handler and fall through to Flask's error handling.
8. Flask -> browser -> JSON result -> UI shows score, checks, recommendations, and reasons.

**QR scan (camera):**
1. Visitor -> QR page -> opens camera -> browser asks permission; unavailable/denied -> error and camera closes.
2. `Html5Qrcode` -> decodes QR -> invalid/non-HTTP(S) value -> UI validation message; valid value -> camera closes and calls same URL scan flow.
3. URL scan API -> result/error -> QR page shows result or error.

**QR scan (image):**
1. Visitor -> file input -> chooses image -> `scanFile` decodes it; unreadable -> error.
2. QR page -> parses decoded value -> non-HTTP(S)/invalid -> error; valid -> sends same `POST /api/scan` flow.
3. Scanner cleanup and busy-state reset run in `finally`.

**History:**
1. Browser -> `HistoryPage` mount -> GET `/api/scans?limit=100` with local browser header.
2. API -> if header present, filters `scans.user_id`; if absent, returns all rows -> JSON list or frontend error.
3. Visitor -> clear action -> browser confirmation canceled means no request; confirmed sends DELETE with header.
4. API -> header present deletes that ID's rows; missing header deletes every row -> `{deleted:true}`.

**Training/external data:**
1. Operator/Render build -> `train_model.py` -> if valid `SENTINEL_DATASET_CSV` exists, load CSV; else call UCI dataset 967 using `ucimlrepo`.
2. Trainer -> cleans/deduplicates/labels/samples/splits -> extracts features -> fits classifier.
3. Trainer -> evaluates held-out split -> writes `.joblib` and `metrics.json`; download/schema/label/training errors stop the build with an exception.

**Current live URL check:**
1. Scan API -> `verify_real_url` -> DNS resolve with `socket.getaddrinfo`; DNS failure returns unsuccessful check.
2. DNS success -> HTTPS context and HTTP HEAD request with a 5-second urllib timeout.
3. HEAD response or HTTPError -> records status/final URL/redirect and sets reachable/TLS fields; other exception -> attempts GET, also with 5-second timeout.
4. Both request attempts fail -> records error; HTTPS marks `tlsValid` false. The code does not restrict target IP ranges or validate redirect destinations against a policy.

**Payments/external identity provider:** NOT IMPLEMENTED.

## 10. CLASS / ENTITY LIST (FOR UML + ER DIAGRAMS)

The project does not define application classes or an ORM. Most logic is module-level functions and React function components.

- **Flask `app`** (`backend/app.py`): configured application; registers route functions. Calls `load_model()` and `ensure_db()` at import and again in script startup.
- **`load_model()`**: loads the joblib bundle into globals `MODEL_BUNDLE`, `MODEL_INFO`, `MODEL_LOAD_ERROR`; called at module import and script startup.
- **`ensure_db()` / `get_db_connection()`**: create/open SQLite database; route functions call connection helper.
- **`normalize_url(raw_url)`**, **`score_to_risk(score)`**, **`is_clean_public_domain(hostname)`**, **`verify_real_url(url)`**, **`build_scan_result(url)`**: validation, threshold labeling, hostname heuristic, DNS/network check, and core inference/scoring. `scan_url()` calls normalization and build result.
- **Flask route functions:** `health_check`, `model_status`, `scan_url`, `list_scans`, `clear_scans`, `model_info`. Routes call DB helpers/model functions as applicable.
- **`extract_features(raw_url)` / `explain_features(raw_url)`** (`backend/ml/features.py`): shared feature generation and human-readable lexical observations. Called by trainer and inference.
- **`load_dataset()`, `normalize_phishing_label(series)`, `main()`** (`backend/ml/train_model.py`): dataset acquisition/preparation, label mapping, training and artifact writing.
- **SQLite entity `scans`**: persisted record fields documented in Section 6. There is no related user entity.
- **React components** (`frontend/src/App.jsx`): `Header`, `Footer`, `Layout`, `Home`, `ResultCard`, `UrlScanPage`, `QrScanPage`, `HistoryPage`, `ModelPage`, `NotFound`; `App` maps routes. `useScan` owns asynchronous scanning state and calls `/api/scan`; pages invoke it.
- **`ScanForm`** (`frontend/src/components/ScanForm.jsx`): separate reusable scanner component with URL/camera logic, but current `App` routes do not import or render it. Its active use is **NOT FOUND**.

## 11. USE CASES

**UC-01 — Scan a URL**
- Primary actor: visitor. Secondary actors: React frontend, Flask API, model, SQLite, target host/network.
- Preconditions: frontend and API available; model loaded; browser has a valid URL value.
- Main steps: enter URL -> client parse -> POST scan -> API normalize -> features/model/network check -> score and reasons -> save -> display.
- Alternate flows: invalid browser URL is ignored by current submit handler; API invalid URL returns 400; unavailable model/inference returns 503; fetch/network issue appears in `realCheck`; API/network error displayed in UI.
- Postconditions: successful scan is persisted and result displayed; failure may leave no new record.

**UC-02 — Scan a QR code with camera**
- Primary actor: visitor. Secondary actors: browser camera, `html5-qrcode`, API/model/database.
- Preconditions: camera permission and supported browser context (localhost or deployed HTTPS), frontend/API available.
- Main steps: open camera -> decode -> validate explicit HTTP(S) -> shared URL scan -> display result.
- Alternate flows: denied/unavailable camera displays error; malformed/non-HTTP(S) content is rejected; API failure displays error.
- Postconditions: valid successful result is persisted; decoded destination is not opened in the browser by the QR UI.

**UC-03 — Scan QR image**
- Primary actor: visitor. Secondary actors: browser file picker, `html5-qrcode`, API/model/database.
- Preconditions: image file selected and services available.
- Main steps: upload/select image -> decode -> validate URL -> shared scan -> show result.
- Alternate flows: no QR/unreadable image or invalid URL displays an error; scanner cleanup runs.
- Postconditions: valid successful result is persisted.

**UC-04 — Review/clear browser scan history**
- Primary actor: visitor. Secondary actor: API/SQLite.
- Preconditions: History page and API reachable.
- Main steps: page load sends GET with browser ID -> rows render -> visitor may refresh or select clear -> confirmation -> DELETE.
- Alternate flows: failed GET/DELETE displays an error; canceled confirm changes nothing; missing ID at API level causes global query/delete.
- Postconditions: list refreshes or selected partition is deleted. Isolation is not secure authentication.

**UC-05 — Review model transparency information**
- Primary actor: visitor. Secondary actor: API/model artifact.
- Preconditions: model metrics JSON or loaded metadata is available.
- Main steps: navigate to `/model` -> frontend requests `/api/model-info` -> show metrics, dataset source, and confusion matrix.
- Alternate flows: unavailable metrics produce a notice; page can remain without the metric section.
- Postconditions: no database mutation.

**UC-06 — Train/update model**
- Primary actor: developer/operator or Render build. Secondary actor: UCI dataset service or local CSV, scikit-learn.
- Preconditions: Python dependencies installed and data available.
- Main steps: load dataset -> clean/map labels -> sample/split -> fit/evaluate -> save bundle and metrics.
- Alternate flows: invalid local CSV columns/labels or dataset fetch/training failure stops execution.
- Postconditions: model/metrics artifacts written; no database seed data is created.

## 12. IMPORTANT CODE SNIPPETS

Authentication/JWT and role middleware snippets do not exist: **NOT IMPLEMENTED**. The following are real excerpts illustrating implemented behavior.

### 12.1 SQLite schema — `backend/app.py`

Creates one table and no user/account relation. `reasons` is JSON serialized into text by the application.

```python
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            hostname TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            confidence INTEGER NOT NULL,
            verdict TEXT NOT NULL,
            model TEXT NOT NULL,
            reasons TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()
```

### 12.2 URL normalization — `backend/app.py`

The API requires HTTP(S) and a netloc. A missing scheme is treated as HTTPS.

```python
def normalize_url(raw_url):
    if raw_url is None:
        raise ValueError("A URL is required.")

    candidate = str(raw_url).strip()
    if not candidate:
        raise ValueError("A URL is required.")

    if "://" not in candidate:
        candidate = f"https://{candidate}"

    parsed = urlsplit(candidate)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Please provide a valid HTTP or HTTPS URL.")

    return parsed.geturl()
```

### 12.3 Risk-level thresholds — `backend/app.py`

These thresholds map the adjusted integer score to the three UI risk categories.

```python
def score_to_risk(score):
    if score >= 70:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def is_clean_public_domain(hostname: str) -> bool:
    if not hostname:
        return False
    labels = [part for part in hostname.split(".") if part]
    if len(labels) < 2:
        return False
    if hostname.startswith("xn--"):
        return False
    if any(part in {"localhost", "local", "internal", "test", "example"} for part in labels):
        return True
    if any(token in hostname for token in ["login", "signin", "verify", "secure", "update", "payment", "confirm", "account", "bank", "wallet", "recover", "suspended", "credential"]):
        return False
    if hostname.count("-") >= 2 or len(hostname) > 45 or hostname.count(".") > 3:
        return False
    return True
```

### 12.4 HTTP(S) probe and fallback — `backend/app.py`

After DNS preflight, the current working tree contacts the submitted URL using HEAD and falls back to GET. The result object is initialized earlier in `verify_real_url()`.

```python
    try:
        ctx = ssl.create_default_context()
        req = urllib_request.Request(url, method="HEAD")
        with urllib_request.urlopen(req, timeout=5, context=ctx) as response:
            result["reachable"] = True
            result["httpStatus"] = getattr(response, "status", None)
            result["finalUrl"] = response.geturl() or url
            result["redirectedTo"] = response.geturl() if response.geturl() != url else None
            result["tlsValid"] = True
    except urllib_error.HTTPError as exc:
        result["reachable"] = True
        result["httpStatus"] = getattr(exc, "code", None)
        result["finalUrl"] = exc.geturl() or url
        result["redirectedTo"] = exc.geturl() if exc.geturl() and exc.geturl() != url else None
        result["tlsValid"] = True
    except Exception:
        try:
            req = urllib_request.Request(url, method="GET")
            with urllib_request.urlopen(req, timeout=5, context=ssl.create_default_context()) as response:
                result["reachable"] = True
                result["httpStatus"] = getattr(response, "status", None)
                result["finalUrl"] = response.geturl() or url
                result["redirectedTo"] = response.geturl() if response.geturl() != url else None
                result["tlsValid"] = True
        except urllib_error.HTTPError as exc:
            result["reachable"] = True
            result["httpStatus"] = getattr(exc, "code", None)
            result["finalUrl"] = exc.geturl() or url
            result["redirectedTo"] = exc.geturl() if exc.geturl() and exc.geturl() != url else None
            result["tlsValid"] = True
        except Exception as exc:
            result["error"] = str(exc)
            if parsed.scheme.lower() == "https":
                result["tlsValid"] = False

    return result
```

### 12.5 Model prediction and score adjustment — `backend/app.py`

The model probability is adjusted by reachability and a hostname heuristic before category selection.

```python
    feature_values = extract_features(url)
    feature_row = pd.DataFrame([feature_values], columns=FEATURE_NAMES)
    probabilities = MODEL_BUNDLE.predict_proba(feature_row)[0]
    classes = list(getattr(MODEL_BUNDLE, "classes_", [0, 1]))

    phishing_index = 1 if 1 in classes else (len(classes) - 1)
    phishing_probability = float(probabilities[phishing_index])
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "unknown").lower()
    reasons = explain_features(url)
    real_check = verify_real_url(url)

    risk_score = max(0, min(100, round(phishing_probability * 100)))
    if real_check.get("dnsResolved") and real_check.get("reachable") and real_check.get("tlsValid"):
        risk_score = max(0, risk_score - 35)
    if is_clean_public_domain(hostname) and not any(token in hostname for token in ["login", "signin", "verify", "secure", "update", "payment", "confirm", "account", "bank", "wallet", "recover", "suspended", "credential"]):
        risk_score = min(risk_score, 25)
    if not real_check.get("dnsResolved") or not real_check.get("reachable"):
        risk_score = max(risk_score, 60)
```

### 12.6 Lexical feature extraction — `backend/ml/features.py`

This excerpt computes URL/hostname statistics including entropy and suspicious-term count. `FEATURE_NAMES` contains 28 ordered model inputs.

```python
    labels = [part for part in host.split(".") if part]
    try:
        ipaddress.ip_address(host)
        is_ip = 1
    except ValueError:
        is_ip = 0
    counts = Counter(raw.lower())
    letters = sum(ch.isalpha() for ch in raw)
    digits = sum(ch.isdigit() for ch in raw)
    specials = sum(not ch.isalnum() for ch in raw)
    freq = Counter(host)
    entropy = -sum((n / max(1, len(host))) * log2(n / max(1, len(host))) for n in freq.values()) if host else 0.0
    terms = sum(1 for term in SUSPICIOUS_TERMS if term in raw.lower())
    tld = labels[-1] if len(labels) > 1 else ""
    path_after_host = path.lstrip("/")
    return {
        "url_length": len(raw), "hostname_length": len(host), "path_length": len(path),
        "query_length": len(query), "tld_length": len(tld), "count_dots": counts["."],
        "count_hyphens": counts["-"], "count_underscores": counts["_"],
        "count_slashes": counts["/"], "count_at": counts["@"], "count_question": counts["?"],
        "count_equal": counts["="], "count_ampersand": counts["&"], "count_percent": counts["%"],
        "count_digits": digits, "digit_ratio": digits / max(1, len(raw)),
        "count_subdomains": max(0, len(labels) - 2), "has_ip": is_ip,
        "uses_https": int(parsed.scheme.lower() == "https"),
```

### 12.7 Model training setup — `backend/ml/train_model.py`

The configured estimator uses a fixed seed and a stratified 80/20 hold-out split.

```python
    feature_rows = [extract_features(url) for url in df["URL"].tolist()]
    X = pd.DataFrame(feature_rows, columns=FEATURE_NAMES).fillna(0)
    y = df["target"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y)
    model = RandomForestClassifier(n_estimators=120, max_depth=24, min_samples_leaf=2,
        class_weight="balanced_subsample", n_jobs=2, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    metrics = {
        "dataset": "UCI PhiUSIIL Phishing URL Dataset (URL-only re-engineered features)",
        "datasetSource": "https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset",
        "rowsUsed": int(len(df)), "phishingRows": int(y.sum()), "legitimateRows": int((1-y).sum()),
        "trainRows": int(len(X_train)), "testRows": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "precision": round(float(precision_score(y_test, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, pred, zero_division=0)), 4),
        "rocAuc": round(float(roc_auc_score(y_test, proba)), 4),
        "confusionMatrix": confusion_matrix(y_test, pred).tolist(),
        "featureCount": len(FEATURE_NAMES), "model": "Random Forest", "randomState": RANDOM_STATE,
    }
    joblib.dump({"model": model, "feature_names": FEATURE_NAMES, "metrics": metrics}, MODEL_DIR / "sentinel_url_model.joblib", compress=3)
    (MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
```

### 12.8 Scan API persistence — `backend/app.py`

A successful prediction is stored using parameterized SQL. The request header is used as a plain partition value.

```python
    payload = request.get_json(silent=True) or {}
    raw_url = payload.get("url") or request.form.get("url")

    try:
        url = normalize_url(raw_url)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        result = build_scan_result(url)
    except Exception as exc:  # pragma: no cover - model availability is runtime checked
        return jsonify({"error": str(exc)}), 503

    user_id = request.headers.get("X-Sentinel-User") or "anonymous"
    reasons_json = json.dumps(result["reasons"], ensure_ascii=False)

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO scans (user_id, url, hostname, risk_level, risk_score, confidence, verdict, model, reasons)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            url,
            result["hostname"],
            result["riskLevel"],
            result["riskScore"],
            result["confidence"],
            result["verdict"],
            result["model"],
            reasons_json,
        ),
    )
```

### 12.9 Frontend scan request and stale-response guard — `frontend/src/App.jsx`

The frontend sends JSON and the local browser ID. Request IDs prevent older responses updating current state.

```javascript
    const analyzeUrl = useCallback(async (url) => {
        const currentRequestId = ++requestId.current;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await fetch(`${API}/api/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...userHeaders() },
                body: JSON.stringify({ url }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Analysis failed.');
            if (!data.scan?.realCheck) {
                throw new Error('The backend is outdated. Restart the SENTINEL API, then scan again.');
            }
            if (requestId.current === currentRequestId) setResult(data.scan);
        } catch (e) {
            if (requestId.current === currentRequestId) {
                setError(e.message || 'Could not connect to the SENTINEL API.');
            }
        } finally {
            if (requestId.current === currentRequestId) setLoading(false);
        }
    }, []);
```

## 13. SECURITY

- **Passwords:** none stored; password-based accounts are **NOT IMPLEMENTED**.
- **Tokens:** JWT/session tokens are **NOT IMPLEMENTED**. `X-Sentinel-User` is generated by frontend localStorage and trusted as supplied by caller; it is spoofable.
- **Authorization/privacy:** no route authorization. `/api/scans` without identity returns global rows and DELETE without identity clears all rows. Do not treat “private for this browser” as an enforced security boundary.
- **CORS:** Flask-Cors applies to `/api/*`; `FRONTEND_ORIGIN` defaults to `*` and `render.yaml` also configures `*`. This is cross-origin policy, not access control.
- **Validation:** API checks missing/empty input, allowed scheme and netloc; frontend applies `new URL`, HTTP(S), dotted hostname check and 2048-character input cap. API does not have that 2048-character cap. QR text must be explicit HTTP(S). SQL writes use `?` parameters.
- **Outbound request risk:** `verify_real_url()` accepts user-controlled hosts, resolves and contacts them, follows urllib redirects, and does not block loopback/private/link-local ranges or re-check redirect targets. This is an SSRF risk in a deployed service. The five-second timeout applies to urllib requests; DNS resolution is not given an explicit timeout here.
- **TLS:** creates a default SSL context. The result field `tlsValid` is also set true on successful HTTP responses and HTTP errors, including plain HTTP URLs, so its display should not be read as proof that every URL used HTTPS.
- **Rate limiting/abuse controls:** **NOT IMPLEMENTED**.
- **Secrets:** no API keys/passwords are needed or included in this report. `.env` is ignored, but no env file was found in tracked files.
- **Security review/fixes:** a security review record or specific security-fix commit is **NOT FOUND** in available Git history. Current working-tree modifications are not a recorded security review.
- **Documentation discrepancy:** README and Home copy say the destination is not opened/contacted, while current `backend/app.py` makes DNS and HTTP(S) requests. The browser does not navigate the user to the scanned destination, but the backend does contact it.

## 14. TESTING

**Tools/files:** No test framework, test directory, or test files were found. `package.json` has `dev`, `build`, and `preview` scripts but no test script. Python requirements do not include pytest or another test runner. No CI workflow is present in the repository inventory. The metrics JSON is model evaluation output, not a software test suite.

| ID | Module | Scenario | Input | Expected result from code | Actual result |
|---|---|---|---|---|---|
| T-01 | Automated test suite | Repository unit/integration/API/E2E suite | N/A | Tests would validate project behavior | NOT FOUND; not run / no suite |
| T-02 | URL API | Missing URL | POST `/api/scan` without `url` | HTTP 400 with “A URL is required.” | NOT RUN |
| T-03 | URL API | Unsupported scheme or missing netloc | POST `/api/scan` with invalid URL | HTTP 400 with URL validation error | NOT RUN |
| T-04 | Model/API | Missing or unavailable model | POST `/api/scan` | HTTP 503 with model/runtime error | NOT RUN |
| T-05 | Scan history | Limit invalid/out of range | GET `/api/scans?limit=...` | Invalid uses 20; valid clamps to 1–200 | NOT RUN |
| T-06 | QR UI | Unreadable image or non-HTTP(S) decoded text | QR image | Error shown; scanner cleanup/busy reset | NOT RUN |
| T-07 | Model artifact | Saved held-out evaluation | Existing `metrics.json` | Metrics and confusion matrix present | Artifact reports values; this is not an executed test |
| T-08 | Plagiarism-check input fixture | Compare project files with `SENTINEL_SOURCE_FOR_PLAGIARISM.txt` | Current source tree and concatenated text snapshot | Exact copied sections should be identifiable as matching material; this does not test an in-app plagiarism feature | NOT RUN; no plagiarism detector or similarity score is implemented |

No PASS/FAIL results for behavioral tests are claimed. Build/test commands and plagiarism checks were not run as part of this repository inspection. `SENTINEL_SOURCE_FOR_PLAGIARISM.txt` contains copied project source sections and is a potential known-match fixture, not a test result, external comparison corpus, or plagiarism-detection tool.

## 15. SCREENS / UI

All screens are available to any visitor; there are no role gates. Route rendering is in `frontend/src/App.jsx`, mounted by `frontend/src/main.jsx`.

| Route/URL | Screen | What it shows | Main actions | Rendering file |
|---|---|---|---|---|
| `/` | Home | SENTINEL purpose, visual hero, links to scan pages, product caveat | Scan URL; Scan QR | `frontend/src/App.jsx` (`Home`) |
| `/scan-url` | URL Scan | URL input, loading/error, risk result, reasons, network-check details | Submit URL; scan another | `frontend/src/App.jsx` (`UrlScanPage`, `ResultCard`) |
| `/scan-qr` | QR Scan | Camera preview/placeholder, QR image upload, decoded URL, result | Open/close camera; upload image; scan another | `frontend/src/App.jsx` (`QrScanPage`, `ResultCard`) |
| `/history` | History | Counts and saved scan rows | Refresh; clear with confirmation; navigate to first scan | `frontend/src/App.jsx` (`HistoryPage`) |
| `/model` | Model | Model/dataset info, accuracy/precision/recall/F1/ROC AUC, confusion matrix | Open UCI dataset source | `frontend/src/App.jsx` (`ModelPage`) |
| Any unmatched route | 404 | Not-found message | Return home | `frontend/src/App.jsx` (`NotFound`) |

Shared header/footer/layout are `Header`, `Footer`, and `Layout` in `frontend/src/App.jsx`; visual rules are `frontend/src/styles.css`. `frontend/src/components/ScanForm.jsx` exists but is not imported by the current routed app.

## 16. DEVELOPMENT HISTORY

Dates below are Git commit dates in the repository timezone (+0530), not inferred start/end dates.

1. **2026-10-11 18:07 +0530 — `f9486d9` “Improve mobile UI and private scan history”.** Commit subject records a mobile UI and scan-history change. The exact design decisions beyond the commit/files are **NOT FOUND**.
2. **2026-10-11 18:23 +0530 — `f2e69b3` “Fix project root structure for Render”.** Commit subject records restructuring/fixing the Render project root configuration. The specific deployment incident or discussion is **NOT FOUND**.
3. **2026-10-13 11:34 +0530 — `34bcaf9` “Add trained SENTINEL phishing model”.** Commit subject records addition of the trained phishing model. Current repository contains `backend/ml/train_model.py`, model artifact, and metrics artifact.
4. **Current uncommitted working-tree state (date NOT FOUND):** `backend/app.py`, `frontend/src/App.jsx`, and `frontend/src/styles.css` are modified; `.vscode/`, `PROJECT_CONTEXT.md`, `SENTINEL_SOURCE_FOR_PLAGIARISM.txt`, and `backend/ml/__init__.py` are untracked. `.vscode/settings.json` sets `chat.tools.terminal.autoApprove` for `npm run build`. The source text file concatenates project files under `===== FILE: ... =====` headings; it is not executable. Current app includes live DNS/HTTP checks and UI display for their fields. These edits are not part of the three listed commits, so no dates/authorship/decision rationale are claimed.

Earlier bug reports, security-review outcomes, and design discussions are **NOT FOUND** in accessible memory/history. The current README itself has claims inconsistent with current code (see Sections 8 and 13); the exact reason/timing for the divergence is **NOT FOUND**.

## 17. LIMITATIONS AND FUTURE SCOPE

**Known limitations/gaps:**
- Model sees lexical URL-derived values, not HTML/page content, redirects as model features, domain reputation feeds, or organization-specific context. Current basic connectivity check is separate from model features.
- Explanation list is rule-based observation, not a causal feature attribution. Model confidence is the largest class probability, not calibrated certainty.
- Current backend contacts untrusted URLs and follows redirects without private-address restrictions; add SSRF defenses or remove the server-side fetch before public production use.
- Browser ID is not authentication; records can be read/deleted by guessing/supplying IDs, and missing ID exposes/deletes global records.
- No authentication/roles, rate limiting, audit/admin view, account management, automated test suite, or CI configuration.
- SQLite on ephemeral hosting may lose data on restart/redeploy; README recommends persistent storage or managed PostgreSQL if durable history is needed.
- `render.yaml` configures `VITE_API_URL` to a different host than the one named in README. Verify and reconcile before deployment.
- README/Home promise not to contact destinations, contrary to current API behavior.
- `tlsValid` can be true for HTTP; this label is broader than the evidence it represents.
- Model training downloads data during Render build and can take several minutes; depends on UCI availability and build resources.
- Vite/React/plugin dependencies use `latest` in `package.json` despite a lockfile; keep installs lockfile-based and consider explicit supported version ranges.
- `backend/ml/train_model.py` comment says numeric local CSV labels default to 1=phishing, but actual numeric mapping branch maps `0` to phishing and `1` to legitimate, matching the UCI convention. Clarify the comment/CSV contract.
- The `is_clean_public_domain` heuristic treats labels `localhost`, `local`, `internal`, `test`, or `example` as a clean domain before the separate unreachable floor is applied; it is a heuristic, not a trustworthy reputation source.
- `frontend/src/components/ScanForm.jsx` is present but unused by the routed application, so behavior there may diverge from the active page.
- No explicit size limit for backend URL API body, uploaded QR image, database retention, or scan history storage.
- README says model binary is not included in source ZIP; the current repository tracks `backend/ml/models/sentinel_url_model.joblib` and `metrics.json`.

**Realistic future scope (proposals, not implemented):** add outbound-request SSRF protections, authenticated identities and authorization, rate limiting, secure per-user history, database migrations and persistent production storage, test coverage/CI, explicit dependency locks, calibrated evaluation on external data, more transparent confidence/explanations, and reconcile UI/docs/deployment URLs.

## 18. SETUP AND DEPLOYMENT

**Prerequisites in repository documentation:** Windows launcher expects Python Launcher `py` and Python 3.11+, Node.js 20+, and internet access for dependency/data downloads. README recommends 64-bit Python. Render sets `PYTHON_VERSION` to 3.11.9.

**Simplest Windows setup:** run `START_SENTINEL.bat` from the repository root. It checks prerequisites, creates `backend\.venv` if absent, upgrades pip, installs `backend\requirements.txt`, trains if the model artifact is absent, installs frontend packages if `frontend\node_modules` is absent, then starts API and Vite in separate command windows. Keep both open.

**Manual setup:**

```bat
cd backend
py -3 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python ml\train_model.py
python app.py
```

In a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Frontend development URL is normally `http://localhost:5173`; API listens at `http://localhost:5000`. To build frontend for production: `cd frontend && npm run build`; preview script is `npm run preview`. No separate database seed command exists. The scan table is auto-created; model training produces the model/metrics artifacts.

**Render steps documented in README:** push repository to GitHub, create a Render Blueprint, connect the repository, inspect the two services, and deploy. `render.yaml` builds backend by installing requirements and running `python ml/train_model.py`; starts Gunicorn with 2 workers, 4 threads, 120-second timeout; health path `/api/health`. Static service runs `npm install && npm run build`, publishes `dist`, and rewrites all routes to `/index.html`.

Before deployment, reconcile the API URL mismatch between README and `render.yaml`, and set `FRONTEND_ORIGIN` to the real frontend origin rather than wildcard for production. README notes Render free services may sleep and ephemeral SQLite may not persist; persistence setup is **NOT IMPLEMENTED** in the blueprint. Successful deployed hosting and the actual live endpoint are **NOT VERIFIED** by this report.

## 19. PLAGIARISM-CHECK TEST DATA (REQUESTED ADDENDUM)

Plagiarism detection is **NOT IMPLEMENTED** in SENTINEL. The following is test data for evaluating a separate plagiarism/similarity checker against this repository. No checker, threshold, score, or verdict is included in the project.

**Known-match corpus:** use `SENTINEL_SOURCE_FOR_PLAGIARISM.txt` as the reference text, and compare it with the repository files listed under its `===== FILE: ... =====` headings. It is a concatenated snapshot of project code, not a corpus of external works. Confirm that its contents still match the working tree before treating it as a current snapshot.

| Case | Test input | Expected qualitative result | Notes |
|---|---|---|---|
| P-01 exact-copy positive | The `normalize_url(raw_url)` function excerpt below, compared with `backend/app.py` and the matching section in `SENTINEL_SOURCE_FOR_PLAGIARISM.txt` | Exact source overlap should be detected | Known project self-match only; it says nothing about copying from an outside source. |
| P-02 exact-copy-with-formatting positive | Copy the same function and change indentation or blank lines only | A code-aware checker may still identify the match; a strict text-only checker may report less overlap | This is a deliberately transformed version of the same project code. |
| P-03 paraphrase/logic positive | “Convert the submitted value to trimmed text; reject an absent or empty value; add HTTPS when the input has no scheme separator; parse it and accept only HTTP or HTTPS with a network location.” | A semantic/code-similarity checker may flag shared logic; exact-match tools may not | A qualitative probe, not a guaranteed result. |
| N-01 unrelated negative control | `def add_tax(amount, rate):\n    return amount * (1 + rate)` | No meaningful match is expected against the URL-scanning source | A tiny generic control is not statistically representative. |

Known-match excerpt for P-01:

```python
def normalize_url(raw_url):
    if raw_url is None:
        raise ValueError("A URL is required.")

    candidate = str(raw_url).strip()
    if not candidate:
        raise ValueError("A URL is required.")

    if "://" not in candidate:
        candidate = f"https://{candidate}"

    parsed = urlsplit(candidate)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Please provide a valid HTTP or HTTPS URL.")

    return parsed.geturl()
```

For a whole-project check, compare the complete source tree (excluding generated dependencies/artifacts as required by the external tool) against the reference corpus, and separately compare with properly licensed/public external sources if the checker supports them. Do not treat a self-match against this project's own source snapshot as an external plagiarism finding. Report the external tool name, version, corpus, settings, and returned scores if an actual check is later performed; those results are **NOT FOUND** at present.
