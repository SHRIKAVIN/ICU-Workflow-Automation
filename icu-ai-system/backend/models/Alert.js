const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['low', 'medium', 'critical'],
    required: true
  },
  type: {
    type: String,
    enum: ['vitals', 'risk', 'bed', 'system'],
    default: 'vitals'
  },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  time: { type: Date, default: Date.now }
}, { timestamps: true });

alertSchema.index({ severity: 1 });
alertSchema.index({ time: -1 });

module.exports = mongoose.model('Alert', alertSchema);
