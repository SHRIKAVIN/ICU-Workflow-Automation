"""Risk prediction model using rule-based + sklearn ensemble."""
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sample_data import generate_training_data, generate_bed_allocation_data


class RiskPredictor:
    """Predicts patient risk level based on vitals."""
    
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=10)
        self.scaler = StandardScaler()
        self.is_trained = False
        self._train()
    
    def _train(self):
        """Train the model on synthetic data."""
        X, y = generate_training_data(2000)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
    
    def predict(self, heart_rate: float, spo2: float, temperature: float,
                bp_systolic: float = 120, bp_diastolic: float = 80,
                respiratory_rate: float = 16) -> dict:
        """
        Predict risk level combining rule-based and ML approaches.
        
        Returns: {risk_score: float (0-1), level: 'low'|'medium'|'critical'}
        """
        # Rule-based scoring
        rule_risk = 0.0
        
        # Heart rate rules
        if heart_rate > 120:
            rule_risk += 0.35
        elif heart_rate > 110:
            rule_risk += 0.25
        elif heart_rate > 100:
            rule_risk += 0.15
        elif heart_rate < 50:
            rule_risk += 0.3
        elif heart_rate < 60:
            rule_risk += 0.1
        
        # SpO2 rules
        if spo2 < 88:
            rule_risk += 0.45
        elif spo2 < 92:
            rule_risk += 0.35
        elif spo2 < 95:
            rule_risk += 0.15
        
        # Temperature rules
        if temperature > 39.5:
            rule_risk += 0.35
        elif temperature > 38.5:
            rule_risk += 0.25
        elif temperature > 38.0:
            rule_risk += 0.1
        elif temperature < 35.0:
            rule_risk += 0.3
        
        # Blood pressure rules
        if bp_systolic > 180 or bp_systolic < 90:
            rule_risk += 0.2
        elif bp_systolic > 160 or bp_systolic < 100:
            rule_risk += 0.1
        
        # Respiratory rate rules
        if respiratory_rate > 30:
            rule_risk += 0.2
        elif respiratory_rate > 25:
            rule_risk += 0.1
        elif respiratory_rate < 10:
            rule_risk += 0.2
        
        rule_risk = min(rule_risk, 1.0)
        
        # ML-based prediction
        features = np.array([[heart_rate, spo2, temperature, bp_systolic, bp_diastolic, respiratory_rate]])
        features_scaled = self.scaler.transform(features)
        ml_proba = self.model.predict_proba(features_scaled)[0]
        
        # ML risk score: weighted sum of probabilities
        ml_risk = ml_proba[1] * 0.5 + ml_proba[2] * 1.0 if len(ml_proba) > 2 else ml_proba[1]
        
        # Ensemble: 60% rule-based + 40% ML
        risk_score = round(0.6 * rule_risk + 0.4 * ml_risk, 3)
        risk_score = min(max(risk_score, 0.0), 1.0)
        
        # Determine level
        if risk_score > 0.7:
            level = "critical"
        elif risk_score > 0.4:
            level = "medium"
        else:
            level = "low"
        
        return {
            "risk_score": risk_score,
            "level": level,
            "rule_based_score": round(rule_risk, 3),
            "ml_score": round(ml_risk, 3),
            "details": {
                "heart_rate_contribution": self._hr_detail(heart_rate),
                "spo2_contribution": self._spo2_detail(spo2),
                "temperature_contribution": self._temp_detail(temperature),
                "bp_contribution": self._bp_detail(bp_systolic),
                "respiratory_contribution": self._rr_detail(respiratory_rate)
            }
        }
    
    def _hr_detail(self, hr):
        if hr > 120: return "Very High"
        if hr > 100: return "Elevated"
        if hr < 50: return "Very Low"
        return "Normal"
    
    def _spo2_detail(self, spo2):
        if spo2 < 88: return "Critically Low"
        if spo2 < 92: return "Low"
        if spo2 < 95: return "Below Normal"
        return "Normal"
    
    def _temp_detail(self, temp):
        if temp > 39.5: return "High Fever"
        if temp > 38.5: return "Fever"
        if temp < 35: return "Hypothermia"
        return "Normal"
    
    def _bp_detail(self, bp):
        if bp > 180: return "Hypertensive Crisis"
        if bp > 160: return "High"
        if bp < 90: return "Hypotension"
        return "Normal"
    
    def _rr_detail(self, rr):
        if rr > 30: return "Tachypnea"
        if rr > 25: return "Elevated"
        if rr < 10: return "Bradypnea"
        return "Normal"


class BedRecommender:
    """Recommends optimal bed type based on patient parameters."""
    
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=30, random_state=42)
        self.scaler = StandardScaler()
        self._train()
    
    def _train(self):
        X, y = generate_bed_allocation_data(1000)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
    
    def recommend(self, severity_score: float, needs_ventilator: bool,
                  needs_isolation: bool, age: float, risk_score: float) -> dict:
        features = np.array([[severity_score, int(needs_ventilator), int(needs_isolation), age, risk_score]])
        features_scaled = self.scaler.transform(features)
        prediction = int(self.model.predict(features_scaled)[0])
        proba = self.model.predict_proba(features_scaled)[0]
        
        room_types = ['normal', 'step-down', 'icu', 'isolation']
        
        return {
            "recommended_room": room_types[prediction],
            "confidence": round(float(max(proba)), 3),
            "probabilities": {room_types[i]: round(float(p), 3) for i, p in enumerate(proba) if i < len(room_types)}
        }
