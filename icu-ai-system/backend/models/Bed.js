const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber: { type: Number, required: true, unique: true },
  roomType: {
    type: String,
    enum: ['icu', 'normal', 'isolation', 'step-down'],
    required: true
  },
  ward: { type: String, required: true },
  floor: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  features: {
    hasVentilator: { type: Boolean, default: false },
    hasMonitor: { type: Boolean, default: true },
    hasOxygenSupply: { type: Boolean, default: true },
    isIsolation: { type: Boolean, default: false },
    nearNursingStation: { type: Boolean, default: false }
  },
  priority: { type: Number, default: 0, min: 0, max: 10 },
  lastSanitized: { type: Date, default: Date.now },
  notes: { type: String, default: '' }
}, { timestamps: true });

bedSchema.index({ roomType: 1, status: 1 });
bedSchema.index({ ward: 1 });

module.exports = mongoose.model('Bed', bedSchema);
