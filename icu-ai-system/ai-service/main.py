"""FastAPI AI Microservice for ICU Risk Prediction & Bed Recommendation."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from models.risk_predictor import RiskPredictor, BedRecommender

app = FastAPI(
    title="ICU AI Service",
    description="Risk prediction and bed allocation intelligence",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models at startup
risk_predictor = RiskPredictor()
bed_recommender = BedRecommender()


class VitalsInput(BaseModel):
    heartRate: float = Field(..., ge=0, le=300, description="Heart rate in bpm")
    spo2: float = Field(..., ge=0, le=100, description="Blood oxygen saturation %")
    temperature: float = Field(..., ge=30, le=45, description="Body temperature in °C")
    bloodPressureSystolic: float = Field(default=120, ge=0, le=300)
    bloodPressureDiastolic: float = Field(default=80, ge=0, le=200)
    respiratoryRate: float = Field(default=16, ge=0, le=60)


class BedInput(BaseModel):
    severity_score: float = Field(..., ge=0, le=1)
    needs_ventilator: bool = False
    needs_isolation: bool = False
    age: float = Field(..., ge=0, le=150)
    risk_score: float = Field(..., ge=0, le=1)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "icu-ai-service",
        "models_loaded": True,
        "risk_predictor_trained": risk_predictor.is_trained
    }


@app.post("/predict")
async def predict_risk(vitals: VitalsInput):
    """Predict patient risk level based on vitals."""
    try:
        result = risk_predictor.predict(
            heart_rate=vitals.heartRate,
            spo2=vitals.spo2,
            temperature=vitals.temperature,
            bp_systolic=vitals.bloodPressureSystolic,
            bp_diastolic=vitals.bloodPressureDiastolic,
            respiratory_rate=vitals.respiratoryRate
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend-bed")
async def recommend_bed(data: BedInput):
    """Recommend optimal bed type for a patient."""
    try:
        result = bed_recommender.recommend(
            severity_score=data.severity_score,
            needs_ventilator=data.needs_ventilator,
            needs_isolation=data.needs_isolation,
            age=data.age,
            risk_score=data.risk_score
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict")
async def batch_predict(patients: list[VitalsInput]):
    """Predict risk for multiple patients at once."""
    results = []
    for vitals in patients:
        result = risk_predictor.predict(
            heart_rate=vitals.heartRate,
            spo2=vitals.spo2,
            temperature=vitals.temperature,
            bp_systolic=vitals.bloodPressureSystolic,
            bp_diastolic=vitals.bloodPressureDiastolic,
            respiratory_rate=vitals.respiratoryRate
        )
        results.append(result)
    return results
