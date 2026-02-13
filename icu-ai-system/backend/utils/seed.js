require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Bed = require('../models/Bed');
const Staff = require('../models/Staff');
const Alert = require('../models/Alert');
const Vitals = require('../models/Vitals');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/icu_system';

const samplePatients = [
  { name: 'John Doe', age: 65, gender: 'Male', bedNumber: 101, roomType: 'icu', status: 'critical', diagnosis: 'Acute Respiratory Distress Syndrome', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse Amy Chen', riskScore: 0.85 },
  { name: 'Jane Smith', age: 42, gender: 'Female', bedNumber: 102, roomType: 'icu', status: 'stable', diagnosis: 'Post-Cardiac Surgery Recovery', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse Amy Chen', riskScore: 0.2 },
  { name: 'Bob Johnson', age: 78, gender: 'Male', bedNumber: 103, roomType: 'icu', status: 'warning', diagnosis: 'Sepsis - Under Treatment', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse David Kim', riskScore: 0.55 },
  { name: 'Alice Brown', age: 55, gender: 'Female', bedNumber: 201, roomType: 'normal', status: 'stable', diagnosis: 'Pneumonia Recovery', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse David Kim', riskScore: 0.1 },
  { name: 'Charlie Wilson', age: 70, gender: 'Male', bedNumber: 104, roomType: 'icu', status: 'critical', diagnosis: 'Multi-Organ Failure', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse Amy Chen', riskScore: 0.92 },
  { name: 'Diana Martinez', age: 38, gender: 'Female', bedNumber: 202, roomType: 'normal', status: 'stable', diagnosis: 'Appendectomy Recovery', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse Priya Sharma', riskScore: 0.05 },
  { name: 'Edward Lee', age: 82, gender: 'Male', bedNumber: 301, roomType: 'isolation', status: 'warning', diagnosis: 'MRSA Infection', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse Priya Sharma', riskScore: 0.6 },
  { name: 'Fiona Garcia', age: 48, gender: 'Female', bedNumber: 105, roomType: 'step-down', status: 'stable', diagnosis: 'Stroke Recovery', assignedDoctor: 'Dr. Sarah Wilson', assignedNurse: 'Nurse David Kim', riskScore: 0.25 }
];

const sampleBeds = [
  // ICU Beds (101-110)
  { bedNumber: 101, roomType: 'icu', ward: 'ICU-A', floor: 1, status: 'occupied', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 102, roomType: 'icu', ward: 'ICU-A', floor: 1, status: 'occupied', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 103, roomType: 'icu', ward: 'ICU-A', floor: 1, status: 'occupied', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 104, roomType: 'icu', ward: 'ICU-B', floor: 1, status: 'occupied', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 105, roomType: 'step-down', ward: 'ICU-B', floor: 1, status: 'occupied', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 106, roomType: 'icu', ward: 'ICU-B', floor: 1, status: 'available', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 107, roomType: 'icu', ward: 'ICU-A', floor: 1, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 108, roomType: 'icu', ward: 'ICU-A', floor: 1, status: 'maintenance', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 109, roomType: 'icu', ward: 'ICU-B', floor: 1, status: 'available', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 110, roomType: 'icu', ward: 'ICU-B', floor: 1, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },

  // Normal Beds (201-210)
  { bedNumber: 201, roomType: 'normal', ward: 'General-A', floor: 2, status: 'occupied', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 202, roomType: 'normal', ward: 'General-A', floor: 2, status: 'occupied', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 203, roomType: 'normal', ward: 'General-A', floor: 2, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 204, roomType: 'normal', ward: 'General-B', floor: 2, status: 'available', features: { hasVentilator: false, hasMonitor: false, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 205, roomType: 'normal', ward: 'General-B', floor: 2, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 206, roomType: 'normal', ward: 'General-B', floor: 2, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: false, isIsolation: false, nearNursingStation: true } },

  // Isolation Beds (301-304)
  { bedNumber: 301, roomType: 'isolation', ward: 'Isolation', floor: 3, status: 'occupied', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: true, nearNursingStation: true } },
  { bedNumber: 302, roomType: 'isolation', ward: 'Isolation', floor: 3, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: true, nearNursingStation: false } },
  { bedNumber: 303, roomType: 'isolation', ward: 'Isolation', floor: 3, status: 'available', features: { hasVentilator: true, hasMonitor: true, hasOxygenSupply: true, isIsolation: true, nearNursingStation: true } },

  // Step-down Beds (401-404)
  { bedNumber: 401, roomType: 'step-down', ward: 'Step-Down', floor: 1, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
  { bedNumber: 402, roomType: 'step-down', ward: 'Step-Down', floor: 1, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: true } },
  { bedNumber: 403, roomType: 'step-down', ward: 'Step-Down', floor: 1, status: 'available', features: { hasVentilator: false, hasMonitor: true, hasOxygenSupply: true, isIsolation: false, nearNursingStation: false } },
];

const sampleStaff = [
  {
    name: 'Dr. Sarah Wilson', role: 'doctor', email: 'doctor@test.com', phone: '+1-555-0101',
    department: 'ICU', shift: 'morning', assignedBeds: [101, 102, 103, 104, 105],
    tasks: [
      { description: 'Review John Doe vitals report', priority: 'high', completed: false },
      { description: 'Post-op check Jane Smith', priority: 'medium', completed: false },
      { description: 'Update Bob Johnson treatment plan', priority: 'high', completed: false }
    ],
    isOnDuty: true
  },
  {
    name: 'Nurse Amy Chen', role: 'nurse', email: 'nurse@test.com', phone: '+1-555-0102',
    department: 'ICU', shift: 'morning', assignedBeds: [101, 102, 104],
    tasks: [
      { description: 'Check vitals Bed 101', priority: 'high', completed: false },
      { description: 'Administer medication Bed 102', priority: 'medium', completed: false },
      { description: 'Update patient charts', priority: 'low', completed: false },
      { description: 'Prepare Bed 104 for shift change', priority: 'medium', completed: false }
    ],
    isOnDuty: true
  },
  {
    name: 'Nurse David Kim', role: 'nurse', email: 'david.kim@hospital.com', phone: '+1-555-0103',
    department: 'ICU', shift: 'morning', assignedBeds: [103, 105, 201],
    tasks: [
      { description: 'Monitor Bob Johnson BP', priority: 'high', completed: false },
      { description: 'Physical therapy assist Bed 105', priority: 'medium', completed: false },
      { description: 'Check IV lines Ward General-A', priority: 'medium', completed: false }
    ],
    isOnDuty: true
  },
  {
    name: 'Nurse Priya Sharma', role: 'nurse', email: 'priya.sharma@hospital.com', phone: '+1-555-0104',
    department: 'General', shift: 'afternoon', assignedBeds: [202, 301],
    tasks: [
      { description: 'Post-op medication Bed 202', priority: 'medium', completed: false },
      { description: 'Isolation protocol check Bed 301', priority: 'high', completed: false }
    ],
    isOnDuty: false
  },
  {
    name: 'Dr. Michael Torres', role: 'doctor', email: 'michael.torres@hospital.com', phone: '+1-555-0105',
    department: 'ICU', shift: 'night', assignedBeds: [101, 102, 103, 104, 105],
    tasks: [],
    isOnDuty: false
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await Patient.deleteMany({});
    await Bed.deleteMany({});
    await Staff.deleteMany({});
    await Alert.deleteMany({});
    await Vitals.deleteMany({});
    logger.info('Cleared existing data');

    // Seed beds first
    const beds = await Bed.insertMany(sampleBeds);
    logger.info(`Seeded ${beds.length} beds`);

    // Seed patients
    const patients = await Patient.insertMany(samplePatients);
    logger.info(`Seeded ${patients.length} patients`);

    // Link patients to beds
    for (const patient of patients) {
      await Bed.findOneAndUpdate(
        { bedNumber: patient.bedNumber },
        { patientId: patient._id, status: 'occupied' }
      );
    }
    logger.info('Linked patients to beds');

    // Seed staff
    const staff = await Staff.insertMany(sampleStaff);
    logger.info(`Seeded ${staff.length} staff members`);

    // Seed some initial alerts
    const alerts = [
      { patientId: patients[0]._id, message: `${patients[0].name} (Bed ${patients[0].bedNumber}): Critical HR 128 bpm, SpO2 87%`, severity: 'critical', type: 'vitals' },
      { patientId: patients[4]._id, message: `${patients[4].name} (Bed ${patients[4].bedNumber}): Risk score 0.92 - multi-organ failure`, severity: 'critical', type: 'risk' },
      { patientId: patients[2]._id, message: `${patients[2].name} (Bed ${patients[2].bedNumber}): Temperature rising to 38.6°C`, severity: 'medium', type: 'vitals' },
      { patientId: patients[6]._id, message: `${patients[6].name} (Bed ${patients[6].bedNumber}): Isolation protocol - daily review`, severity: 'low', type: 'system' },
    ];
    await Alert.insertMany(alerts);
    logger.info(`Seeded ${alerts.length} alerts`);

    // Generate initial vitals history for each patient (last hour, every 5 min = 12 readings)
    for (const patient of patients) {
      const vitalsHistory = [];
      for (let i = 11; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 5 * 60 * 1000);
        const vitalsData = generateVitalsForStatus(patient.status);
        let riskScore = 0;
        if (vitalsData.heartRate > 110) riskScore += 0.3;
        if (vitalsData.spo2 < 92) riskScore += 0.4;
        if (vitalsData.temperature > 38.5) riskScore += 0.3;
        riskScore = Math.min(riskScore, 1);
        let riskLevel = 'low';
        if (riskScore > 0.7) riskLevel = 'critical';
        else if (riskScore > 0.4) riskLevel = 'medium';

        vitalsHistory.push({
          patientId: patient._id,
          ...vitalsData,
          riskScore,
          riskLevel,
          timestamp
        });
      }
      await Vitals.insertMany(vitalsHistory);
    }
    logger.info('Generated vitals history for all patients');

    logger.info('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Seed error:', err);
    process.exit(1);
  }
}

function generateVitalsForStatus(status) {
  const r = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1));
  switch (status) {
    case 'critical': return { heartRate: r(105, 140), spo2: r(82, 93), temperature: r(38.2, 40.0), bloodPressureSystolic: r(150, 190), bloodPressureDiastolic: r(90, 120), respiratoryRate: r(22, 35) };
    case 'warning': return { heartRate: r(90, 115), spo2: r(90, 96), temperature: r(37.5, 38.8), bloodPressureSystolic: r(130, 155), bloodPressureDiastolic: r(80, 95), respiratoryRate: r(18, 25) };
    default: return { heartRate: r(60, 95), spo2: r(95, 100), temperature: r(36.2, 37.4), bloodPressureSystolic: r(110, 135), bloodPressureDiastolic: r(65, 85), respiratoryRate: r(12, 20) };
  }
}

seed();
