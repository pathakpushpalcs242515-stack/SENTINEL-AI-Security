# SENTINEL | AI SECURITY

**Smart Phishing & Malicious URL Detector** — a luxury beige/cream/brown React web app with separate Home, URL Scan, QR Scan, Scan History, and Model Performance pages.

## What is connected

- **Actual ML pipeline:** Python + Flask + scikit-learn Random Forest classifier.
- **Public dataset:** UCI PhiUSIIL Phishing URL Dataset (235,795 records reported by UCI). Training uses the raw URL and the dataset label, then computes the project's own URL-only lexical features. The training script stratifies a configurable subset (50,000 rows by default to keep free-tier deployment memory manageable), evaluates on a held-out test split, and saves the model and measured metrics.
- **Inference:** URL input and QR-decoded URLs call the same `POST /api/scan` endpoint.
- **Database:** SQLite stores scan history and risk results. Database is created automatically.
- **Pages:** `/` home, `/scan-url`, `/scan-qr`, `/history`, `/model`.
- **Safety:** the app does not fetch/open submitted destinations. QR codes are decoded and checked before a user opens any destination.

Dataset citation/source: [UCI Machine Learning Repository — PhiUSIIL Phishing URL Dataset](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset). UCI reports 235,795 records, with label `1` for legitimate and `0` for phishing. The dataset is licensed CC BY 4.0; retain attribution if you redistribute dataset-derived material.

## Run locally on Windows

You need Node.js 20+ and Python 3.11+ (64-bit recommended). If `py` is unavailable, install Python from python.org and enable the Python Launcher during setup. Open two Command Prompt terminals in the project folder.

### 1. Train/download the model (first run only)

```bat
cd backend
py -3 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python ml\train_model.py
```

Training downloads the public dataset using `ucimlrepo`, creates URL features, evaluates the classifier, and saves:

- `backend/ml/models/sentinel_url_model.joblib`
- `backend/ml/models/metrics.json`

The model is not included as a pre-trained binary in this source ZIP; it is generated from the public dataset by the training command above. The measured metrics shown by the website come from this training run, not hard-coded sample claims.

### 2. Start the API

In the same backend terminal, after training:

```bat
python app.py
```

API: `http://localhost:5000`

### 3. Start the frontend

Open a second terminal from the project root:

```bat
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Camera access works on localhost; deployed camera access requires HTTPS.

## API endpoints

- `GET /api/health` — API, database, and model status.
- `POST /api/scan` — analyze and save a URL; JSON body: `{ "url": "https://example.com" }`.
- `GET /api/scans?limit=20` — recent scans.
- `DELETE /api/scans` — clear scan history.
- `GET /api/model-info` — measured training/test metrics and confusion matrix.

## Deployment to Render

The included `render.yaml` describes a Flask API and a separate static React site. Push the project to a GitHub repository, sign in to Render, choose **New → Blueprint**, and connect that repository. Review the two services before confirming. The API build downloads the dataset and trains the model on a stratified sample (50,000 rows by default); this can take several minutes and depends on the hosting build resources. The frontend's `VITE_API_URL` is set to `https://sentinel-ai-security-api.onrender.com`; if you rename the API service, update this value to its actual HTTPS URL and redeploy the frontend.

Set `FRONTEND_ORIGIN` on the API to the deployed frontend origin rather than `*` for a stricter production configuration. SQLite on a free ephemeral host may not persist across restarts/redeploys; use a persistent disk or managed PostgreSQL if long-term scan history is required. Render's free services can sleep when idle.

## Important limitations

- The model estimates phishing risk from URL string features only. It does not inspect page content, perform a live domain reputation lookup, validate the live TLS certificate, or guarantee a website is safe.
- Risk percentage is the model's estimated phishing probability, not a guarantee or externally verified reputation score. Model confidence is the highest class probability.
- The explanation list reports observed URL characteristics; it should not be interpreted as a causal feature attribution.
- Treat low-risk results cautiously and verify sensitive links through a trusted channel.
