"""Download the public UCI PhiUSIIL dataset, train and evaluate a URL-only classifier.

UCI dataset: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
Target definition in UCI: 1 = legitimate, 0 = phishing.
This script uses only the raw URL column and recomputes lexical features to avoid
relying on precomputed dataset features at inference time.
"""
import json
import os
from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(HERE))
from features import FEATURE_NAMES, extract_features

MAX_ROWS = int(os.getenv("SENTINEL_TRAIN_ROWS", "50000"))
RANDOM_STATE = 42

def load_dataset():
    local = os.getenv("SENTINEL_DATASET_CSV")
    if local and Path(local).exists():
        df = pd.read_csv(local)
        url_col = next((c for c in df.columns if c.lower() == "url"), None)
        label_col = next((c for c in df.columns if c.lower() in {"label", "status", "result", "target"}), None)
        if not url_col or not label_col:
            raise ValueError("Local CSV must contain URL and label columns.")
        return df[[url_col, label_col]].rename(columns={url_col: "URL", label_col: "label"})
    from ucimlrepo import fetch_ucirepo
    print("Downloading PhiUSIIL Phishing URL dataset from UCI…", flush=True)
    dataset = fetch_ucirepo(id=967)
    X, y = dataset.data.features, dataset.data.targets
    url_col = next((c for c in X.columns if c.lower() == "url"), None)
    if not url_col:
        raise ValueError("The UCI dataset did not expose a raw URL column.")
    target_col = y.columns[0]
    return pd.DataFrame({"URL": X[url_col].astype(str), "label": y[target_col]})

def normalize_phishing_label(series):
    # UCI PhiUSIIL labels: 1 legitimate, 0 phishing. Other CSV labels are accepted
    # if they are recognizable; numeric binary CSV labels default to 1=phishing.
    vals = set(series.dropna().astype(str).str.strip().str.lower().unique())
    if vals and vals.issubset({"0", "1", "0.0", "1.0"}):
        return (pd.to_numeric(series) == 0).astype(int)
    mapping = {"phishing": 1, "malicious": 1, "bad": 1, "unsafe": 1,
               "legitimate": 0, "benign": 0, "good": 0, "safe": 0,
               "phish": 1, "1": 1, "0": 0}
    normalized = series.astype(str).str.strip().str.lower().map(mapping)
    if normalized.isna().any():
        raise ValueError("Labels must identify phishing/malicious vs legitimate/benign URLs.")
    return normalized.astype(int)

def main():
    df = load_dataset().dropna(subset=["URL", "label"]).copy()
    df["URL"] = df["URL"].astype(str).str.strip()
    df = df[df["URL"].str.len().between(4, 2048)].drop_duplicates(subset=["URL"])
    df["target"] = normalize_phishing_label(df["label"])
    if len(df) > MAX_ROWS:
        # Stratified sample preserves both classes while keeping deployment build time reasonable.
        df, _ = train_test_split(df, train_size=MAX_ROWS, random_state=RANDOM_STATE, stratify=df["target"])
    print(f"Training on {len(df):,} unique URLs; phishing={int(df.target.sum()):,}, legitimate={int((1-df.target).sum()):,}", flush=True)
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
    print(json.dumps(metrics, indent=2), flush=True)
    print(f"Saved model to {MODEL_DIR / 'sentinel_url_model.joblib'}", flush=True)

if __name__ == "__main__":
    main()
