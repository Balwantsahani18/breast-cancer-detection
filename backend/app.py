from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import math
import google.generativeai as genai
import os
import base64
import json
import re
from pydantic import BaseModel
from typing import List, Optional
import PIL.Image, io    

app = FastAPI(title="OncoSight API", version="3.0")

# ── Load model and scaler ──────────────────────────────────────────
model  = joblib.load("model/breast_cancer_model.pkl")
scaler = joblib.load("model/scaler.pkl")

# ── Anthropic client (reads ANTHROPIC_API_KEY from env automatically) ──
genai.configure(api_key=os.environ.get("AIzaSyCstsSsxWH-Zzi51LwP0dQYb-aA5qPBqVw"))
gemini = genai.GenerativeModel("gemini-2.5-flash")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    features: List[float]          # exactly 30 features

class ReportRequest(BaseModel):
    prediction: str
    confidence: int
    values: dict                   # all 30 named values

# ─────────────────────────────────────────────────────────────────
#  HEALTH
# ─────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"message": "OncoSight API v3 Running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ─────────────────────────────────────────────────────────────────
#  PREDICT
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

        # WBCD encoding: 1 = Benign, 0 = Malignant
        label          = "Benign" if prediction == 1 else "Malignant"
        benign_prob    = float(probs[1]) if len(probs) > 1 else float(probs[0])
        malignant_prob = float(probs[0]) if len(probs) > 1 else 1 - float(probs[0])

        return {
            "prediction":     label,
            "probability":    float(max(probs)),
            "benign_prob":    round(benign_prob,    4),
            "malignant_prob": round(malignant_prob, 4),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────
#  AI CLINICAL REPORT  (proxies Anthropic — avoids browser CORS)
# ─────────────────────────────────────────────────────────────────
@app.post("/report")
def generate_report(req: ReportRequest):
    v  = req.values
    is_malignant = req.prediction == "Malignant"

    prompt = f"""You are an expert oncology data analyst. Based on the 30 FNA (Fine Needle Aspiration) biopsy measurements below from the Wisconsin Breast Cancer Dataset, write a detailed 5-section clinical analysis report. Be specific, data-driven, and professional.

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

Write exactly these 5 sections using the emoji headers shown. Each section should be 3–5 sentences and data-specific:

🔍 KEY FINDINGS
Identify the 4-5 most diagnostically significant measurements. For each, state the patient's value, compare it to the benign and malignant averages, and note whether it falls in the normal or elevated range.

📊 RISK FACTOR ANALYSIS
Explain quantitatively which features most strongly drove the {req.prediction} classification. Discuss how the radius, area, concavity, concave points, and compactness measurements individually and collectively compare to decision boundaries. Mention the {req.confidence}% confidence and what drives it.

🔬 MORPHOLOGICAL INTERPRETATION
Describe what the cell shape measurements (symmetry, fractal dimension, compactness, concavity) indicate about the underlying tissue morphology. Explain what high or low values in these metrics mean physically about cell structure and growth patterns.

🏥 CLINICAL INTERPRETATION
In accessible language, explain what these FNA biopsy results mean for the patient. Describe the significance of the {req.prediction} finding and the confidence level. Compare key values to typical {"cancer" if is_malignant else "benign tissue"} patterns.

✅ RECOMMENDED NEXT STEPS
Provide 3-4 specific, prioritized clinical recommendations tailored to this {"Malignant" if is_malignant else "Benign"} result. {"Include imaging, biopsy confirmation, and specialist referral." if is_malignant else "Include follow-up schedule, monitoring parameters, and lifestyle factors."}

Professional oncology tone. Reference the actual numbers in your analysis. No generic disclaimers inside the report."""

    try:
        response = gemini.generate_content(prompt)
        report_text = response.text
        return {"report": report_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────
#  UPLOAD & EXTRACT  (PDF / image / doc → autofill fields)
# ─────────────────────────────────────────────────────────────────
@app.post("/extract")
async def extract_from_file(file: UploadFile = File(...)):
    """
    Accept a PDF, image (jpg/png), or text file containing biopsy measurements.
    Use Claude vision/doc to extract the 30 feature values and return them as JSON.
    """
    content_type = file.content_type or ""
    file_bytes   = await file.read()
    image = PIL.Image.open(io.BytesIO(file_bytes))
    response = gemini.generate_content([EXTRACT_PROMPT, image])
    raw = response.text

    # Build the message content for Claude
    if content_type.startswith("image/"):
        # Image: send as base64 vision
        b64 = base64.standard_b64encode(file_bytes).decode("utf-8")
        media_type = content_type  # image/jpeg or image/png
        user_content = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": b64},
            },
            {
                "type": "text",
                "text": EXTRACT_PROMPT,
            },
        ]
    elif content_type == "application/pdf":
        # PDF: send as base64 document
        b64 = base64.standard_b64encode(file_bytes).decode("utf-8")
        user_content = [
            {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
            },
            {
                "type": "text",
                "text": EXTRACT_PROMPT,
            },
        ]
    else:
        # Plain text / other: decode and send as text
        try:
            text_content = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            raise HTTPException(status_code=415, detail="Unsupported file type")
        user_content = f"{EXTRACT_PROMPT}\n\nDOCUMENT TEXT:\n{text_content}"

    try:
        response = gemini.generate_content(prompt_with_text)
        raw = response.text

        # Extract JSON block
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if not json_match:
            raise HTTPException(status_code=422, detail="Could not parse measurements from file")

        extracted = json.loads(json_match.group())
        # Convert all values to float where possible
        clean = {}
        for k, val in extracted.items():
            try:
                clean[k] = float(val)
            except (TypeError, ValueError):
                pass
        return {"values": clean, "found": len(clean)}

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse JSON from Claude response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


EXTRACT_PROMPT = """You are a medical data extraction assistant. Extract breast cancer FNA (Fine Needle Aspiration) biopsy measurements from this document/image.

Look for any of these 30 feature values (the document may use different formatting or abbreviations):
radius_mean, texture_mean, perimeter_mean, area_mean, smoothness_mean, compactness_mean, concavity_mean, concave_points_mean, symmetry_mean, fractal_dimension_mean,
radius_se, texture_se, perimeter_se, area_se, smoothness_se, compactness_se, concavity_se, concave_points_se, symmetry_se, fractal_dimension_se,
radius_worst, texture_worst, perimeter_worst, area_worst, smoothness_worst, compactness_worst, concavity_worst, concave_points_worst, symmetry_worst, fractal_dimension_worst

Return ONLY a valid JSON object with the field names above as keys and their numeric values. Only include fields that you can confidently extract from the document. Do not guess or fabricate values.

Example output format:
{"radius_mean": 17.99, "texture_mean": 10.38, "area_mean": 1001}

If no relevant measurements are found, return: {}"""