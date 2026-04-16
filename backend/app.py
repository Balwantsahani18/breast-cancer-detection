"""
OncoSight API  v4.0
───────────────────
Run:
    pip install fastapi uvicorn joblib scikit-learn numpy google-generativeai python-multipart pillow
    export GEMINI_API_KEY=AIza...your_key_here
    uvicorn app:app --reload --port 8000

Get a FREE Gemini API key (no credit card):
    https://aistudio.google.com  →  Sign in with Google  →  "Get API Key"
"""

import os, base64, json, re, io
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from pydantic import BaseModel
from typing import List

# ── Gemini (FREE) ──────────────────────────────────────────────────
import google.generativeai as genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Models used
GEMINI_TEXT  = "gemini-2.5-flash"   # free tier · for report generation
GEMINI_VISION = "gemini-2.5-flash"  # same model handles vision/PDF

# ── FastAPI app ────────────────────────────────────────────────────
app = FastAPI(title="OncoSight API", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load ML model & scaler ─────────────────────────────────────────
model  = joblib.load("model/breast_cancer_model.pkl")
scaler = joblib.load("model/scaler.pkl")


# ─────────────────────────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    features: List[float]   # exactly 30 features in model order

class ReportRequest(BaseModel):
    prediction: str         # "Benign" or "Malignant"
    confidence: int         # 0–100
    values: dict            # all 30 named feature values


# ─────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────
def _gemini_text_model():
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not set. "
                   "Get a free key at https://aistudio.google.com and run: "
                   "export GEMINI_API_KEY=AIza..."
        )
    return genai.GenerativeModel(GEMINI_TEXT)


def _extract_json(raw: str) -> dict:
    """Pull the first {...} JSON block out of a string."""
    m = re.search(r'\{[\s\S]*\}', raw)
    if not m:
        return {}
    try:
        data = json.loads(m.group())
        return {k: float(v) for k, v in data.items()
                if isinstance(v, (int, float, str)) and _is_number(v)}
    except (json.JSONDecodeError, ValueError):
        return {}

def _is_number(v):
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False


# ─────────────────────────────────────────────────────────────────
#  HEALTH
# ─────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "OncoSight API v4 Running", "ai": "Google Gemini (free)"}

@app.get("/health")
def health():
    key_set = bool(GEMINI_API_KEY)
    return {"status": "ok", "gemini_key_configured": key_set}


# ─────────────────────────────────────────────────────────────────
#  PREDICT  – ML model inference
# ─────────────────────────────────────────────────────────────────
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

        # Wisconsin Breast Cancer Dataset encoding:
        #   model class 1 = Benign (B),  class 0 = Malignant (M)
        # Adjust below if your model uses a different encoding.
        label          = "Benign" if int(prediction) == 1 else "Malignant"
        benign_prob    = float(probs[1]) if len(probs) > 1 else float(probs[0])
        malignant_prob = float(probs[0]) if len(probs) > 1 else 1.0 - float(probs[0])

        return {
            "prediction":     label,
            "probability":    round(float(max(probs)), 4),
            "benign_prob":    round(benign_prob,    4),
            "malignant_prob": round(malignant_prob, 4),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────
#  REPORT  – AI clinical report via Gemini (FREE, server-side)
# ─────────────────────────────────────────────────────────────────
@app.post("/report")
def generate_report(req: ReportRequest):
    gemini = _gemini_text_model()
    v      = req.values
    is_mal = req.prediction == "Malignant"

    prompt = f"""You are an expert oncology data analyst. Based on the 30 FNA (Fine Needle Aspiration) \
biopsy measurements below from the Wisconsin Breast Cancer Dataset, write a detailed 5-section clinical \
analysis report. Be specific, data-driven, and professional.

ML PREDICTION: {req.prediction.upper()} (Confidence: {req.confidence}%)

ALL 30 MEASUREMENTS:
── Mean values ──
  Radius Mean:            {v.get('radius_mean')}
  Texture Mean:           {v.get('texture_mean')}
  Perimeter Mean:         {v.get('perimeter_mean')}
  Area Mean:              {v.get('area_mean')}
  Smoothness Mean:        {v.get('smoothness_mean')}
  Compactness Mean:       {v.get('compactness_mean')}
  Concavity Mean:         {v.get('concavity_mean')}
  Concave Points Mean:    {v.get('concave_points_mean')}
  Symmetry Mean:          {v.get('symmetry_mean')}
  Fractal Dimension Mean: {v.get('fractal_dimension_mean')}

── Standard error values ──
  Radius SE:            {v.get('radius_se')}
  Texture SE:           {v.get('texture_se')}
  Perimeter SE:         {v.get('perimeter_se')}
  Area SE:              {v.get('area_se')}
  Smoothness SE:        {v.get('smoothness_se')}
  Compactness SE:       {v.get('compactness_se')}
  Concavity SE:         {v.get('concavity_se')}
  Concave Points SE:    {v.get('concave_points_se')}
  Symmetry SE:          {v.get('symmetry_se')}
  Fractal Dimension SE: {v.get('fractal_dimension_se')}

── Worst (largest 3 cells) values ──
  Radius Worst:            {v.get('radius_worst')}
  Texture Worst:           {v.get('texture_worst')}
  Perimeter Worst:         {v.get('perimeter_worst')}
  Area Worst:              {v.get('area_worst')}
  Smoothness Worst:        {v.get('smoothness_worst')}
  Compactness Worst:       {v.get('compactness_worst')}
  Concavity Worst:         {v.get('concavity_worst')}
  Concave Points Worst:    {v.get('concave_points_worst')}
  Symmetry Worst:          {v.get('symmetry_worst')}
  Fractal Dimension Worst: {v.get('fractal_dimension_worst')}

REFERENCE AVERAGES (Wisconsin dataset):
  Benign:    radius_mean≈12.1, area_mean≈462,  concavity_mean≈0.046, radius_worst≈14.2, area_worst≈558,  compactness_worst≈0.21
  Malignant: radius_mean≈17.5, area_mean≈978,  concavity_mean≈0.161, radius_worst≈21.1, area_worst≈1422, compactness_worst≈0.54

Write EXACTLY these 5 sections with the emoji headers shown below. Each section must be 3–5 sentences \
and must reference the actual numeric values above.

🔍 KEY FINDINGS
Identify the 4–5 most diagnostically significant measurements. For each, state the patient value, \
compare it to the benign and malignant dataset averages, and note whether it is in the normal or elevated range.

📊 RISK FACTOR ANALYSIS
Explain quantitatively which features most strongly drove the {req.prediction} classification. \
Discuss radius, area, concavity, concave points, and compactness individually and collectively versus \
decision boundaries. Explain what drives the {req.confidence}% confidence score.

🔬 MORPHOLOGICAL INTERPRETATION
Describe what the cell shape measurements (symmetry, fractal dimension, compactness, concavity) \
indicate about the tissue morphology. Explain what the recorded values mean physically about \
cell structure and growth patterns.

🏥 CLINICAL INTERPRETATION
In plain language, explain what these FNA biopsy results mean. Describe the significance of the \
{req.prediction} finding and the confidence level. Compare key values to typical \
{"malignant cancer" if is_mal else "benign tissue"} patterns.

✅ RECOMMENDED NEXT STEPS
Provide 3–4 specific, prioritised clinical recommendations for this {"Malignant" if is_mal else "Benign"} result. \
{"Include imaging, confirmatory biopsy, and specialist referral." if is_mal else \
"Include follow-up schedule, monitoring parameters, and lifestyle factors."}

Professional oncology tone. Reference the actual numbers throughout. Do NOT add generic disclaimers \
inside the report body."""

    try:
        response    = gemini.generate_content(prompt)
        report_text = response.text
        return {"report": report_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini report generation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────
#  EXTRACT  – upload PDF / image / text → autofill fields (FREE)
# ─────────────────────────────────────────────────────────────────
EXTRACT_PROMPT = """You are a medical data extraction assistant. \
Extract breast cancer FNA (Fine Needle Aspiration) biopsy measurements from this document or image.

Look for any of these 30 feature values (the document may use different formatting or abbreviations):
radius_mean, texture_mean, perimeter_mean, area_mean, smoothness_mean, compactness_mean,
concavity_mean, concave_points_mean, symmetry_mean, fractal_dimension_mean,
radius_se, texture_se, perimeter_se, area_se, smoothness_se, compactness_se,
concavity_se, concave_points_se, symmetry_se, fractal_dimension_se,
radius_worst, texture_worst, perimeter_worst, area_worst, smoothness_worst,
compactness_worst, concavity_worst, concave_points_worst, symmetry_worst, fractal_dimension_worst

Return ONLY a valid JSON object with the field names above as keys and their numeric values.
Only include fields you can confidently extract. Do NOT guess or fabricate values.

Example:
{"radius_mean": 17.99, "texture_mean": 10.38, "area_mean": 1001}

If no relevant measurements are found, return: {}"""


@app.post("/extract")
async def extract_from_file(file: UploadFile = File(...)):
    """
    Accept a PDF, JPG/PNG image, or text file containing biopsy measurements.
    Uses Gemini vision/document AI (FREE) to extract feature values.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not set. Set it with: export GEMINI_API_KEY=AIza..."
        )

    content_type = (file.content_type or "").lower()
    file_bytes   = await file.read()

    try:
        gemini_vision = genai.GenerativeModel(GEMINI_VISION)

        if content_type.startswith("image/"):
            # ── Image (JPG / PNG) ──────────────────────────────────
            from PIL import Image
            img      = Image.open(io.BytesIO(file_bytes))
            response = gemini_vision.generate_content([EXTRACT_PROMPT, img])

        elif content_type == "application/pdf":
            # ── PDF: encode as inline data ─────────────────────────
            b64      = base64.standard_b64encode(file_bytes).decode("utf-8")
            pdf_part = {"mime_type": "application/pdf", "data": b64}
            response = gemini_vision.generate_content([EXTRACT_PROMPT, pdf_part])

        else:
            # ── Plain text / .txt / .doc fallback ──────────────────
            text_content = file_bytes.decode("utf-8", errors="replace")
            full_prompt  = f"{EXTRACT_PROMPT}\n\nDOCUMENT TEXT:\n{text_content}"
            gemini_text  = genai.GenerativeModel(GEMINI_TEXT)
            response     = gemini_text.generate_content(full_prompt)

        raw       = response.text.strip()
        extracted = _extract_json(raw)

        return {"values": extracted, "found": len(extracted)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")