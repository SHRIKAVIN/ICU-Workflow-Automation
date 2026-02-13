const Patient = require('../models/Patient');
const Vitals = require('../models/Vitals');
const Alert = require('../models/Alert');
const { predictRisk } = require('../services/aiService');
const logger = require('./logger');

function randomInRange(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateVitalsForStatus(status) {
  switch (status) {
    case 'critical':
      return {
        heartRate: randomInRange(105, 140),
        spo2: randomInRange(82, 93),
        temperature: randomInRange(38.2, 40.0),
        bloodPressureSystolic: randomInRange(150, 190),
        bloodPressureDiastolic: randomInRange(90, 120),
        respiratoryRate: randomInRange(22, 35)
      };
    case 'warning':
      return {
        heartRate: randomInRange(90, 115),
        spo2: randomInRange(90, 96),
        temperature: randomInRange(37.5, 38.8),
        bloodPressureSystolic: randomInRange(130, 155),
        bloodPressureDiastolic: randomInRange(80, 95),
        respiratoryRate: randomInRange(18, 25)
      };
    case 'stable':
    default:
      return {
        heartRate: randomInRange(60, 95),
        spo2: randomInRange(95, 100),
        temperature: randomInRange(36.2, 37.4),
        bloodPressureSystolic: randomInRange(110, 135),
        bloodPressureDiastolic: randomInRange(65, 85),
        respiratoryRate: randomInRange(12, 20)
      };
  }
}

async function emitVitalsForPatient(patient, io) {
  try {
    const vitalsData = generateVitalsForStatus(patient.status);
    const prediction = await predictRisk(vitalsData);

    const vitals = new Vitals({
      patientId: patient._id,
      ...vitalsData,
      riskScore: prediction.risk_score,
      riskLevel: prediction.level
    });
    await vitals.save();

    // Update patient risk score
    await Patient.findByIdAndUpdate(patient._id, { riskScore: prediction.risk_score });

    // Emit to all clients
    io.emit('updateVitals', {
      patientId: patient._id,
      vitals: vitals.toObject(),
      riskScore: prediction.risk_score,
      riskLevel: prediction.level,
      patientName: patient.name,
      bedNumber: patient.bedNumber
    });

    // Emit to patient-specific room
    io.to(`patient-${patient._id}`).emit('patientVitals', vitals.toObject());

    // Create alerts for critical
    if (prediction.risk_score > 0.7) {
      const alert = new Alert({
        patientId: patient._id,
        message: `${patient.name} (Bed ${patient.bedNumber}): Risk score ${prediction.risk_score.toFixed(2)} - immediate attention needed`,
        severity: 'critical',
        type: 'vitals'
      });
      await alert.save();
      io.emit('newAlert', { ...alert.toObject(), patientName: patient.name });
    }
  } catch (err) {
    logger.error(`Error generating vitals for ${patient.name}:`, err.message);
  }
}

function startVitalsSimulator(io) {
  logger.info('Starting vitals simulator...');

  // Emit vitals every 10 seconds for each active patient
  setInterval(async () => {
    try {
      const patients = await Patient.find({ status: { $ne: 'discharged' } });
      for (const patient of patients) {
        await emitVitalsForPatient(patient, io);
      }
    } catch (err) {
      logger.error('Vitals simulator error:', err.message);
    }
  }, 10000);

  logger.info('Vitals simulator started (interval: 10s)');
}

module.exports = { startVitalsSimulator, generateVitalsForStatus, emitVitalsForPatient };
