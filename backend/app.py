from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from pydantic import BaseModel
from typing import List

app = FastAPI(title="OncoSight API", version="2.0")

# Load model and scaler
model  = joblib.load("model/breast_cancer_model.pkl")
scaler = joblib.load("model/scaler.pkl")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    features: List[float]

@app.get("/")
def home():
    return {"message": "OncoSight API Running", "version": "2.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: PredictRequest):
    try:
        if len(data.features) != 30:
            raise HTTPException(
                status_code=422,
                detail=f"Expected 30 features, got {len(data.features)}"
            )

        features = np.array(data.features).reshape(1, -1)
        scaled   = scaler.transform(features)

        prediction = model.predict(scaled)[0]
        probs      = model.predict_proba(scaled)[0]

        # prediction == 1 → Benign (B), 0 → Malignant (M) in the WBCD encoding
        label         = "Benign" if prediction == 1 else "Malignant"
        benign_prob   = float(probs[1]) if len(probs) > 1 else float(probs[0])
        malignant_prob = float(probs[0]) if len(probs) > 1 else 1 - float(probs[0])

        return {
            "prediction":     label,
            "probability":    float(max(probs)),
            "benign_prob":    benign_prob,
            "malignant_prob": malignant_prob,
            "input_values":   data.features,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))