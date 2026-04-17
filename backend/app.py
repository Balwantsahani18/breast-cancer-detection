"""
OncoSight API  v4.2
─────────────────────────────────────────────────────────────────
SETUP (one time):
    pip install fastapi uvicorn joblib scikit-learn numpy \
                google-generativeai python-multipart pillow

RUN:
    export GEMINI_API_KEY=AIza...your_free_key
    uvicorn app:app --reload --port 8000

Get a FREE Gemini key (no credit card):
    https://aistudio.google.com  →  Sign in  →  "Get API Key"

ENDPOINTS:
    GET  /health     → health check
    POST /predict    → ML inference (30 features)
    POST /report     → Gemini AI clinical report (optional — used when key set)
    POST /extract    → upload PDF/image/text → extract biopsy values
─────────────────────────────────────────────────────────────────
"""

import os, base64, json, re, io
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from pydantic import BaseModel
from typing import List, Optional

# ── Gemini ────────────────────────────────────────────────────────
import google.generativeai as genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-2.0-flash"

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"✅ Gemini configured with model: {GEMINI_MODEL}")
else:
    print("⚠️  GEMINI_API_KEY not set — /report and /extract will return errors.")
    print("   Set it with:  export GEMINI_API_KEY=AIza...")
    print("   Get a free key at: https://aistudio.google.com")

# ── FastAPI ───────────────────────────────────────────────────────
app = FastAPI(title="OncoSight API", version="4.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model & scaler ───────────────────────────────────────────
try:
    model  = joblib.load("model/breast_cancer_model.pkl")
    scaler = joblib.load("model/scaler.pkl")
    print("✅ Model and scaler loaded.")
except Exception as e:
    print(f"❌ Model load failed: {e}")
    model = scaler = None


# ─────────────────────────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    features: List[float]

class ReportRequest(BaseModel):
    prediction: str       # "Benign" or "Malignant"
    confidence: int       # 0–100
    values: dict          # all 30 named feature values


# ─────────────────────────────────────────────────────────────────
#  HEALTH
# ─────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {
        "api":            "OncoSight v4.2",
        "model_ready":    model is not None,
        "gemini_ready":   bool(GEMINI_API_KEY),
        "gemini_model":   GEMINI_MODEL,
    }

@app.get("/health")
def health():
    return {
        "status":           "ok",
        "model_loaded":     model is not None,
        "gemini_configured": bool(GEMINI_API_KEY),
    }


# ─────────────────────────────────────────────────────────────────
#  PREDICT
# ─────────────────────────────────────────────────────────────────
@app.post("/predict")
def predict(data: PredictRequest):
    if model is None or scaler is None:
        raise HTTPException(503, "Model not loaded.")

    if len(data.features) != 30:
        raise HTTPException(422, f"Expected 30 features, got {len(data.features)}.")

    try:
        feat   = np.array(data.features, dtype=float).reshape(1, -1)
        scaled = scaler.transform(feat)
        pred   = model.predict(scaled)[0]
        probs  = model.predict_proba(scaled)[0]

        # WBCD encoding: class 1 = Benign, class 0 = Malignant
        label     = "Benign" if int(pred) == 1 else "Malignant"
        b_prob    = float(probs[1]) if len(probs) > 1 else float(probs[0])
        m_prob    = float(probs[0]) if len(probs) > 1 else 1.0 - float(probs[0])

        return {
            "prediction":     label,
            "probability":    round(float(max(probs)), 4),
            "benign_prob":    round(b_prob, 4),
            "malignant_prob": round(m_prob, 4),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prediction error: {e}")


# ─────────────────────────────────────────────────────────────────
#  REPORT  (optional — Gemini AI clinical report)
#  The React frontend generates its own local report if this fails.
# ─────────────────────────────────────────────────────────────────
@app.post("/report")
def generate_report(req: ReportRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            503,
            "GEMINI_API_KEY not configured on server. "
            "Set it with: export GEMINI_API_KEY=AIza... "
            "Get a free key at https://aistudio.google.com"
        )

    v      = req.values
    is_mal = req.prediction == "Malignant"

    prompt = f"""You are an expert oncology data analyst. Based on the 30 FNA biopsy measurements from the Wisconsin Breast Cancer Dataset below, write a detailed 5-section clinical analysis report. Reference the actual numbers in every section.

ML PREDICTION: {req.prediction.upper()} (Confidence: {req.confidence}%)

MEASUREMENTS:
Mean — Radius:{v.get('radius_mean')} | Texture:{v.get('texture_mean')} | Perimeter:{v.get('perimeter_mean')} | Area:{v.get('area_mean')} | Smoothness:{v.get('smoothness_mean')} | Compactness:{v.get('compactness_mean')} | Concavity:{v.get('concavity_mean')} | Concave Pts:{v.get('concave_points_mean')} | Symmetry:{v.get('symmetry_mean')} | Fractal Dim:{v.get('fractal_dimension_mean')}
SE    — Radius:{v.get('radius_se')} | Texture:{v.get('texture_se')} | Perimeter:{v.get('perimeter_se')} | Area:{v.get('area_se')} | Smoothness:{v.get('smoothness_se')} | Compactness:{v.get('compactness_se')} | Concavity:{v.get('concavity_se')} | Concave Pts:{v.get('concave_points_se')} | Symmetry:{v.get('symmetry_se')} | Fractal Dim:{v.get('fractal_dimension_se')}
Worst — Radius:{v.get('radius_worst')} | Texture:{v.get('texture_worst')} | Perimeter:{v.get('perimeter_worst')} | Area:{v.get('area_worst')} | Smoothness:{v.get('smoothness_worst')} | Compactness:{v.get('compactness_worst')} | Concavity:{v.get('concavity_worst')} | Concave Pts:{v.get('concave_points_worst')} | Symmetry:{v.get('symmetry_worst')} | Fractal Dim:{v.get('fractal_dimension_worst')}

REFERENCE: Benign avg: radius≈12.1, area≈462, concavity≈0.046, radius_worst≈14.2, area_worst≈558
           Malignant avg: radius≈17.5, area≈978, concavity≈0.161, radius_worst≈21.1, area_worst≈1422

Write EXACTLY these 5 sections. Each must be 4–6 sentences referencing actual values.

🔍 KEY FINDINGS
📊 RISK FACTOR ANALYSIS
🔬 MORPHOLOGICAL INTERPRETATION
🏥 CLINICAL INTERPRETATION
✅ RECOMMENDED NEXT STEPS

For RECOMMENDED NEXT STEPS, write as a numbered list (1. 2. 3. 4.).
{"Malignant steps: urgent oncologist referral, confirmatory biopsy, imaging, staging." if is_mal else "Benign steps: follow-up schedule, monitoring criteria, watchful waiting, preventive measures."}
Professional tone. No generic disclaimers inside the report."""

    try:
        model_gemini = genai.GenerativeModel(GEMINI_MODEL)
        response     = model_gemini.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                max_output_tokens=2000,
            )
        )
        report_text = response.text
        return {"report": report_text, "source": "gemini"}

    except Exception as e:
        raise HTTPException(500, f"Gemini report generation failed: {e}")


# ─────────────────────────────────────────────────────────────────
#  EXTRACT  –  upload biopsy PDF/image/text → autofill fields
# ─────────────────────────────────────────────────────────────────
EXTRACT_PROMPT = """You are a medical data extraction assistant.
Extract breast cancer FNA biopsy measurements from this document or image.

Look for these 30 exact feature names (may appear with different formatting):
radius_mean, texture_mean, perimeter_mean, area_mean, smoothness_mean, compactness_mean,
concavity_mean, concave_points_mean, symmetry_mean, fractal_dimension_mean,
radius_se, texture_se, perimeter_se, area_se, smoothness_se, compactness_se,
concavity_se, concave_points_se, symmetry_se, fractal_dimension_se,
radius_worst, texture_worst, perimeter_worst, area_worst, smoothness_worst,
compactness_worst, concavity_worst, concave_points_worst, symmetry_worst, fractal_dimension_worst

Return ONLY a valid JSON object. Keys must be the exact field names. Values must be numbers.
Only include values you can confidently read. Do NOT guess or fabricate.

Example: {"radius_mean": 17.99, "texture_mean": 10.38}
If nothing found: {}"""


def _parse_json(raw: str) -> dict:
    m = re.search(r'\{[\s\S]*?\}', raw)
    if not m:
        return {}
    try:
        data = json.loads(m.group())
        return {k: float(v) for k, v in data.items()
                if isinstance(v, (int, float)) or
                (isinstance(v, str) and v.replace(".", "").replace("-", "").isdigit())}
    except Exception:
        return {}


@app.post("/extract")
async def extract_from_file(file: UploadFile = File(...)):
    if not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY not set. export GEMINI_API_KEY=AIza...")

    content_type = (file.content_type or "").lower()
    file_bytes   = await file.read()

    try:
        gemini = genai.GenerativeModel(GEMINI_MODEL)

        if content_type.startswith("image/"):
            from PIL import Image
            img      = Image.open(io.BytesIO(file_bytes))
            response = gemini.generate_content([EXTRACT_PROMPT, img])

        elif content_type == "application/pdf":
            b64      = base64.standard_b64encode(file_bytes).decode()
            pdf_part = {"mime_type": "application/pdf", "data": b64}
            response = gemini.generate_content([EXTRACT_PROMPT, pdf_part])

        else:
            text = file_bytes.decode("utf-8", errors="replace")
            response = gemini.generate_content(f"{EXTRACT_PROMPT}\n\nDOCUMENT:\n{text}")

        raw       = (response.text or "").strip()
        extracted = _parse_json(raw)
        return {"values": extracted, "found": len(extracted)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {e}")