
import json
import os
import socket
import sqlite3
import ssl
import sys
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request
from urllib.parse import urlsplit

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
ML_DIR = BASE_DIR / "ml"
MODEL_DIR = ML_DIR / "models"
MODEL_PATH = MODEL_DIR / "sentinel_url_model.joblib"
METRICS_PATH = MODEL_DIR / "metrics.json"
DB_DIR = BASE_DIR / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "sentinel.db"

sys.path.insert(0, str(BASE_DIR))
from ml.features import FEATURE_NAMES, explain_features, extract_features

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

allowed_origins = os.getenv("FRONTEND_ORIGIN", "*")
if allowed_origins and allowed_origins.strip() != "*":
    allowed_origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
else:
    allowed_origins = "*"
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

MODEL_BUNDLE = None
MODEL_LOAD_ERROR = None
MODEL_INFO = {}


def load_model():
    global MODEL_BUNDLE, MODEL_LOAD_ERROR, MODEL_INFO
    try:
        if not MODEL_PATH.exists():
            MODEL_BUNDLE = None
            MODEL_LOAD_ERROR = f"Model is missing at {MODEL_PATH}. Run: python ml/train_model.py"
            return

        bundle = joblib.load(MODEL_PATH)
        if isinstance(bundle, dict):
            MODEL_BUNDLE = bundle.get("model")
            MODEL_INFO = bundle.get("metrics", {})
        else:
            MODEL_BUNDLE = bundle
            MODEL_INFO = {}

        if MODEL_INFO:
            try:
                MODEL_INFO["dataset"] = MODEL_INFO.get("dataset") or json.loads(METRICS_PATH.read_text(encoding="utf-8"))["dataset"]
            except Exception:
                pass

        MODEL_LOAD_ERROR = None
    except Exception as exc:  # pragma: no cover - runtime driven by model presence
        MODEL_BUNDLE = None
        MODEL_LOAD_ERROR = str(exc)


load_model()


def ensure_db():
    conn = sqlite3.connect(DB_PATH)
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


ensure_db()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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


def verify_real_url(url: str):
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower()
    result = {
        "dnsResolved": False,
        "reachable": False,
        "tlsValid": False,
        "httpStatus": None,
        "redirectedTo": None,
        "finalUrl": url,
        "error": None,
    }

    if not hostname:
        result["error"] = "No hostname was found in the provided URL."
        return result

    try:
        socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme.lower() == "https" else 80), type=socket.SOCK_STREAM)
        result["dnsResolved"] = True
    except socket.gaierror as exc:
        result["error"] = f"DNS resolution failed: {exc}"
        return result

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


def build_scan_result(url):
    if MODEL_BUNDLE is None:
        raise RuntimeError(MODEL_LOAD_ERROR or "The phishing model is not available.")

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

    confidence = max(0, min(100, round(float(max(probabilities)) * 100)))

    if risk_score >= 70:
        verdict = "This link looks highly suspicious and is likely a phishing or malicious destination."
    elif risk_score >= 30:
        verdict = "This link shows moderate risk indicators, so it should be checked carefully before login or payment actions."
    else:
        verdict = "This link does not show strong phishing indicators and the domain appears to be reachable and legitimate on basic inspection."

    return {
        "url": url,
        "hostname": hostname,
        "riskScore": risk_score,
        "riskLevel": score_to_risk(risk_score),
        "confidence": confidence,
        "model": "Random Forest",
        "verdict": verdict,
        "reasons": reasons,
        "realCheck": real_check,
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "database": "ready",
        "dbPath": str(DB_PATH),
        "modelReady": MODEL_BUNDLE is not None,
        "model": "Random Forest" if MODEL_BUNDLE is not None else None,
        "error": MODEL_LOAD_ERROR,
    })


@app.route("/api/model", methods=["GET"])
def model_status():
    return jsonify({
        "ready": MODEL_BUNDLE is not None,
        "model": "Random Forest" if MODEL_BUNDLE is not None else None,
        "modelPath": str(MODEL_PATH),
        "modelFileExists": MODEL_PATH.is_file(),
        "error": MODEL_LOAD_ERROR,
    }), 200 if MODEL_BUNDLE is not None else 503


@app.route("/api/scan", methods=["POST"])
def scan_url():
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
    conn.commit()
    last_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    conn.close()

    result["id"] = last_id
    result["createdAt"] = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    return jsonify({"scan": result, "status": "ok"})


@app.route("/api/scans", methods=["GET"])
def list_scans():
    try:
        limit = int(request.args.get("limit", "20"))
    except ValueError:
        limit = 20
    limit = max(1, min(limit, 200))
    user_id = request.headers.get("X-Sentinel-User")

    conn = get_db_connection()
    if user_id:
        rows = conn.execute(
            "SELECT * FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM scans ORDER BY id DESC LIMIT ?", (limit,)).fetchall()

    scans = []
    for row in rows:
        scans.append({
            "id": row["id"],
            "userId": row["user_id"],
            "url": row["url"],
            "hostname": row["hostname"],
            "riskLevel": row["risk_level"],
            "riskScore": row["risk_score"],
            "confidence": row["confidence"],
            "verdict": row["verdict"],
            "model": row["model"],
            "reasons": json.loads(row["reasons"] or "[]"),
            "createdAt": row["created_at"],
        })
    conn.close()
    return jsonify({"scans": scans})


@app.route("/api/scans", methods=["DELETE"])
def clear_scans():
    conn = get_db_connection()
    user_id = request.headers.get("X-Sentinel-User")
    if user_id:
        conn.execute("DELETE FROM scans WHERE user_id = ?", (user_id,))
    else:
        conn.execute("DELETE FROM scans")
    conn.commit()
    conn.close()
    return jsonify({"deleted": True})


@app.route("/api/model-info", methods=["GET"])
def model_info():
    try:
        metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}
    except Exception:
        metrics = {}
    if MODEL_INFO:
        metrics.update(MODEL_INFO)
    if not metrics:
        return jsonify({"error": "Model metrics are not available yet."}), 503
    return jsonify(metrics)


if __name__ == "__main__":
    ensure_db()
    load_model()
    app.run(host="0.0.0.0", port=5000, debug=False)
