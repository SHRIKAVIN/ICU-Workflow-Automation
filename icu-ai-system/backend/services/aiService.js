const axios = require('axios');
const logger = require('../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function predictRisk(vitals) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
      heartRate: vitals.heartRate,
      spo2: vitals.spo2,
      temperature: vitals.temperature,
      bloodPressureSystolic: vitals.bloodPressureSystolic || 120,
      bloodPressureDiastolic: vitals.bloodPressureDiastolic || 80,
      respiratoryRate: vitals.respiratoryRate || 16
    }, { timeout: 5000 });

    return response.data;
  } catch (err) {
    logger.warn('AI service unavailable, using fallback rule-based prediction');
    return fallbackPredict(vitals);
  }
}

function fallbackPredict(vitals) {
  let risk = 0;

  if (vitals.heartRate > 110) risk += 0.3;
  else if (vitals.heartRate > 100) risk += 0.15;
  else if (vitals.heartRate < 50) risk += 0.25;

  if (vitals.spo2 < 90) risk += 0.4;
  else if (vitals.spo2 < 92) risk += 0.3;
  else if (vitals.spo2 < 95) risk += 0.15;

  if (vitals.temperature > 39) risk += 0.3;
  else if (vitals.temperature > 38.5) risk += 0.2;
  else if (vitals.temperature < 35) risk += 0.25;

  risk = Math.min(risk, 1);

  let level = 'low';
  if (risk > 0.7) level = 'critical';
  else if (risk > 0.4) level = 'medium';

  return { risk_score: parseFloat(risk.toFixed(3)), level };
}

async function getBedRecommendation(patientData) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/recommend-bed`, patientData, { timeout: 5000 });
    return response.data;
  } catch (err) {
    logger.warn('AI bed recommendation unavailable');
    return null;
  }
}

module.exports = { predictRisk, fallbackPredict, getBedRecommendation };
