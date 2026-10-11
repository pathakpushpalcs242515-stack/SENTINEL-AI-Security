from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
from urllib.parse import urlsplit

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from ml.features import FEATURE_NAMES, extract_features, explain_features

BASE = Path(__file__).resolve().parent
MODEL_PATH = BASE / "ml" / "models" / "sentinel_url_model.joblib"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(BASE / "data" / "scans.db")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
app = Flask(__name__)
CORS(app, origins=os.getenv("FRONTEND_ORIGIN", "*").split(","))
MODEL_BUNDLE = None
if MODEL_PATH.exists():
    MODEL_BUNDLE = joblib.load(MODEL_PATH)

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL DEFAULT 'legacy', url TEXT NOT NULL, hostname TEXT NOT NULL,
            risk_score INTEGER NOT NULL, risk_level TEXT NOT NULL, verdict TEXT NOT NULL,
            confidence INTEGER NOT NULL, reasons TEXT NOT NULL, created_at TEXT NOT NULL
        )""")
        # Safe migration for an older database created by the Node version.
        columns = {row[1] for row in conn.execute("PRAGMA table_info(scans)")}
        if "user_id" not in columns: conn.execute("ALTER TABLE scans ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'")
        if "confidence" not in columns: conn.execute("ALTER TABLE scans ADD COLUMN confidence INTEGER NOT NULL DEFAULT 0")
        if "created_at" not in columns: conn.execute("ALTER TABLE scans ADD COLUMN created_at TEXT")
init_db()

def request_user_id():
    value = (request.headers.get("X-Sentinel-User") or "").strip()
    if not value:
        return "legacy"
    # Browser-generated identifier for per-browser history. This is not an account credential.
    return value[:128]

def serialize(row):
    return {"id": row["id"], "url": row["url"], "hostname": row["hostname"],
        "riskScore": row["risk_score"], "riskLevel": row["risk_level"], "verdict": row["verdict"],
        "confidence": row["confidence"], "reasons": json.loads(row["reasons"]), "createdAt": row["created_at"]}

def analyze_url(raw_url):
    if MODEL_BUNDLE is None:
        raise RuntimeError("ML model is not trained yet. Run: python ml/train_model.py")
    features = extract_features(raw_url)
    model = MODEL_BUNDLE["model"]
    frame = pd.DataFrame([[features[name] for name in FEATURE_NAMES]], columns=FEATURE_NAMES)
    probabilities = model.predict_proba(frame)[0]
    phishing_index = list(model.classes_).index(1)
    risk_score = int(round(float(probabilities[phishing_index]) * 100))
    confidence = int(round(float(max(probabilities)) * 100))
    risk_level = "LOW" if risk_score < 30 else "MODERATE" if risk_score < 65 else "HIGH"
    verdict = {"LOW": "Lower predicted phishing risk", "MODERATE": "Suspicious — use caution", "HIGH": "High predicted phishing risk"}[risk_level]
    reasons = explain_features(raw_url)
    return {"hostname": urlsplit(raw_url).hostname or "unknown", "riskScore": risk_score,
        "riskLevel": risk_level, "verdict": verdict, "confidence": confidence,
        "reasons": reasons, "features": features, "model": "Random Forest"}

@app.get("/")
def index(): return jsonify({"service": "SENTINEL API", "status": "online", "docs": "See README.md"})

@app.get("/api/health")
def health():
    try:
        with get_db() as conn: conn.execute("SELECT 1")
        db_status = "connected"
    except Exception: db_status = "error"
    return jsonify({"ok": db_status == "connected", "database": db_status,
        "model": "trained" if MODEL_BUNDLE else "missing", "modelReady": MODEL_BUNDLE is not None})

@app.get("/api/model-info")
def model_info():
    metrics_path = BASE / "ml" / "models" / "metrics.json"
    if not metrics_path.exists():
        return jsonify({"ready": False, "message": "Model metrics will appear after training."}), 503
    return jsonify({"ready": MODEL_BUNDLE is not None, **json.loads(metrics_path.read_text(encoding="utf-8"))})

@app.post("/api/scan")
def scan():
    body = request.get_json(silent=True) or {}
    raw = body.get("url", "")
    if not isinstance(raw, str) or not raw.strip() or len(raw.strip()) > 2048:
        return jsonify({"error": "Provide a URL between 1 and 2048 characters."}), 400
    raw = raw.strip()
    candidate = raw if "://" in raw else "https://" + raw
    try:
        parsed = urlsplit(candidate)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or "." not in parsed.hostname:
            raise ValueError()
        # Validate port and hostname parsing without making any network request.
        _ = parsed.port
    except ValueError:
        return jsonify({"error": "Enter a valid full HTTP or HTTPS website URL."}), 400
    try:
        result = analyze_url(candidate)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception:
        app.logger.exception("URL analysis failed")
        return jsonify({"error": "The URL could not be analyzed."}), 500
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        user_id = request_user_id()
        cursor = conn.execute("INSERT INTO scans (user_id,url,hostname,risk_score,risk_level,verdict,confidence,reasons,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (user_id, candidate, result["hostname"], result["riskScore"], result["riskLevel"], result["verdict"], result["confidence"], json.dumps(result["reasons"]), created_at))
        row = conn.execute("SELECT * FROM scans WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify({"scan": {**serialize(row), "features": result["features"], "model": result["model"]}}), 201

@app.get("/api/scans")
def scans():
    try: limit = min(100, max(1, int(request.args.get("limit", "20"))))
    except ValueError: limit = 20
    user_id = request_user_id()
    with get_db() as conn: rows = conn.execute("SELECT * FROM scans WHERE user_id=? ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()
    return jsonify({"scans": [serialize(row) for row in rows]})

@app.delete("/api/scans")
def clear_scans():
    user_id = request_user_id()
    with get_db() as conn: conn.execute("DELETE FROM scans WHERE user_id=?", (user_id,))
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
