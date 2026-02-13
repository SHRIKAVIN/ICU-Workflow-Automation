const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0, max: 150 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  bedNumber: { type: Number, required: true, unique: true },
  roomType: { type: String, enum: ['icu', 'normal', 'isolation', 'step-down'], default: 'icu' },
  status: {
    type: String,
    enum: ['critical', 'warning', 'stable', 'discharged'],
    default: 'stable'
  },
  diagnosis: { type: String, default: '' },
  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date },
  assignedDoctor: { type: String, default: '' },
  assignedNurse: { type: String, default: '' },
  riskScore: { type: Number, default: 0, min: 0, max: 1 },
  allergies: [{ type: String }],
  notes: { type: String, default: '' }
}, { timestamps: true });

patientSchema.index({ status: 1 });
patientSchema.index({ roomType: 1 });

module.exports = mongoose.model('Patient', patientSchema);
