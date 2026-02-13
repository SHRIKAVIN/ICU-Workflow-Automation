const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  heartRate: { type: Number, required: true, min: 0, max: 300 },
  spo2: { type: Number, required: true, min: 0, max: 100 },
  temperature: { type: Number, required: true, min: 30, max: 45 },
  bloodPressureSystolic: { type: Number, min: 0, max: 300, default: 120 },
  bloodPressureDiastolic: { type: Number, min: 0, max: 200, default: 80 },
  respiratoryRate: { type: Number, min: 0, max: 60, default: 16 },
  riskScore: { type: Number, default: 0, min: 0, max: 1 },
  riskLevel: { type: String, enum: ['low', 'medium', 'critical'], default: 'low' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

vitalsSchema.index({ patientId: 1, timestamp: -1 });

module.exports = mongoose.model('Vitals', vitalsSchema);
