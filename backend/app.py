
@app.get("/api/model")
def model_status():
    return jsonify({
        "ready": MODEL_BUNDLE is not None,
        "model": "Random Forest" if MODEL_BUNDLE is not None else None,
        "modelPath": str(MODEL_PATH),
        "modelFileExists": MODEL_PATH.is_file(),
        "error": MODEL_LOAD_ERROR
    }), 200 if MODEL_BUNDLE is not None else 503
