const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ['doctor', 'nurse', 'technician', 'admin'],
    required: true
  },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  department: { type: String, default: 'ICU' },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
    default: 'morning'
  },
  assignedBeds: [{ type: Number }],
  tasks: [{
    description: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed: { type: Boolean, default: false },
    dueTime: { type: Date }
  }],
  isOnDuty: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
