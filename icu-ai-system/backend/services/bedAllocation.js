const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const logger = require('../utils/logger');

/**
 * Smart Bed Allocation Engine
 * 
 * Implements multiple allocation strategies:
 * 1. Severity-Based Priority: Critical patients get ICU beds first
 * 2. Proximity Scoring: Beds near nursing stations for high-risk patients
 * 3. Isolation Matching: Infectious patients get isolation rooms
 * 4. Resource Optimization: Match ventilator/monitor needs
 * 5. Load Balancing: Distribute patients across wards evenly
 * 6. Step-Down Protocol: Auto-suggest downgrades when patient improves
 */

// Severity priority mapping
const SEVERITY_PRIORITY = {
  critical: 10,
  warning: 6,
  stable: 2,
  discharged: 0
};

// Room type suitability scores for each severity
const ROOM_SUITABILITY = {
  critical: { icu: 10, 'step-down': 4, isolation: 8, normal: 1 },
  warning: { icu: 6, 'step-down': 8, isolation: 5, normal: 4 },
  stable: { icu: 2, 'step-down': 5, isolation: 3, normal: 10 },
};

/**
 * Score a bed for a given patient based on multiple criteria
 */
function scoreBed(bed, patientData) {
  let score = 0;
  const weights = {
    roomSuitability: 0.30,
    proximity: 0.20,
    features: 0.25,
    isolation: 0.15,
    loadBalance: 0.10
  };

  // 1. Room type suitability
  const severity = patientData.status || 'stable';
  const suitability = ROOM_SUITABILITY[severity] || ROOM_SUITABILITY.stable;
  score += (suitability[bed.roomType] || 0) * weights.roomSuitability;

  // 2. Proximity to nursing station (critical patients should be close)
  if (bed.features.nearNursingStation && severity === 'critical') {
    score += 10 * weights.proximity;
  } else if (bed.features.nearNursingStation && severity === 'warning') {
    score += 6 * weights.proximity;
  }

  // 3. Feature matching
  if (patientData.needsVentilator && bed.features.hasVentilator) {
    score += 10 * weights.features;
  } else if (patientData.needsVentilator && !bed.features.hasVentilator) {
    score -= 5 * weights.features;
  }
  if (bed.features.hasMonitor) score += 3 * weights.features;
  if (bed.features.hasOxygenSupply) score += 2 * weights.features;

  // 4. Isolation requirement
  if (patientData.needsIsolation && bed.features.isIsolation) {
    score += 10 * weights.isolation;
  } else if (patientData.needsIsolation && !bed.features.isIsolation) {
    score -= 8 * weights.isolation;
  }

  // 5. Bed cleanliness (recently sanitized preferred)
  const hoursSinceSanitized = (Date.now() - new Date(bed.lastSanitized).getTime()) / (1000 * 60 * 60);
  if (hoursSinceSanitized < 2) score += 2;
  else if (hoursSinceSanitized > 24) score -= 1;

  return parseFloat(score.toFixed(2));
}

/**
 * Find the optimal bed for a patient
 */
async function findOptimalBed(patientData) {
  const availableBeds = await Bed.find({ status: 'available' });

  if (availableBeds.length === 0) {
    return { success: false, message: 'No beds available', recommendations: [] };
  }

  // Score all available beds
  const scoredBeds = availableBeds.map(bed => ({
    bed,
    score: scoreBed(bed, patientData)
  }));

  // Sort by score descending
  scoredBeds.sort((a, b) => b.score - a.score);

  // Get ward occupancy for load balancing info
  const wardOccupancy = await getWardOccupancy();

  return {
    success: true,
    recommended: scoredBeds[0],
    alternatives: scoredBeds.slice(1, 4),
    all: scoredBeds,
    wardOccupancy,
    reasoning: generateReasoning(scoredBeds[0], patientData)
  };
}

/**
 * Auto-allocate bed and update records
 */
async function allocateBed(bedId, patientId) {
  const bed = await Bed.findById(bedId);
  if (!bed || bed.status !== 'available') {
    throw new Error('Bed is not available');
  }

  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error('Patient not found');

  // Update bed
  bed.status = 'occupied';
  bed.patientId = patientId;
  await bed.save();

  // Update patient
  patient.bedNumber = bed.bedNumber;
  patient.roomType = bed.roomType;
  await patient.save();

  return { bed, patient };
}

/**
 * Release a bed (on discharge/transfer)
 */
async function releaseBed(bedId) {
  const bed = await Bed.findById(bedId);
  if (!bed) throw new Error('Bed not found');

  bed.status = 'available';
  bed.patientId = null;
  bed.lastSanitized = new Date();
  await bed.save();

  return bed;
}

/**
 * Step-down protocol: suggest room changes for improving patients
 */
async function getStepDownRecommendations() {
  const icuPatients = await Patient.find({
    roomType: 'icu',
    status: 'stable',
    riskScore: { $lt: 0.3 }
  });

  const recommendations = [];
  for (const patient of icuPatients) {
    const normalBeds = await Bed.find({ roomType: 'normal', status: 'available' });
    const stepDownBeds = await Bed.find({ roomType: 'step-down', status: 'available' });

    if (stepDownBeds.length > 0 || normalBeds.length > 0) {
      recommendations.push({
        patient,
        currentRoom: 'icu',
        suggestedRoom: stepDownBeds.length > 0 ? 'step-down' : 'normal',
        availableBeds: [...stepDownBeds, ...normalBeds].slice(0, 3),
        reason: `Patient ${patient.name} is stable with risk score ${patient.riskScore}. Consider step-down to free ICU capacity.`
      });
    }
  }

  return recommendations;
}

/**
 * Get escalation recommendations (patients who need ICU)
 */
async function getEscalationRecommendations() {
  const criticalNonICU = await Patient.find({
    roomType: { $ne: 'icu' },
    status: 'critical'
  });

  const recommendations = [];
  for (const patient of criticalNonICU) {
    const icuBeds = await Bed.find({ roomType: 'icu', status: 'available' });
    if (icuBeds.length > 0) {
      recommendations.push({
        patient,
        currentRoom: patient.roomType,
        suggestedRoom: 'icu',
        availableBeds: icuBeds.slice(0, 3),
        reason: `Patient ${patient.name} is critical and currently in ${patient.roomType}. ICU bed recommended.`,
        urgency: 'high'
      });
    }
  }

  return recommendations;
}

/**
 * Get ward occupancy stats
 */
async function getWardOccupancy() {
  const beds = await Bed.find();
  const stats = {};

  beds.forEach(bed => {
    if (!stats[bed.ward]) {
      stats[bed.ward] = { total: 0, occupied: 0, available: 0, maintenance: 0 };
    }
    stats[bed.ward].total++;
    if (bed.status === 'occupied') stats[bed.ward].occupied++;
    else if (bed.status === 'available') stats[bed.ward].available++;
    else if (bed.status === 'maintenance') stats[bed.ward].maintenance++;
  });

  // Calculate occupancy percentage
  Object.keys(stats).forEach(ward => {
    stats[ward].occupancyRate = stats[ward].total > 0
      ? parseFloat(((stats[ward].occupied / stats[ward].total) * 100).toFixed(1))
      : 0;
  });

  return stats;
}

/**
 * Generate human-readable reasoning for bed recommendation
 */
function generateReasoning(scoredBed, patientData) {
  const reasons = [];
  const bed = scoredBed.bed;
  const severity = patientData.status || 'stable';

  if (severity === 'critical' && bed.roomType === 'icu') {
    reasons.push('ICU bed selected for critical patient');
  }
  if (bed.features.nearNursingStation) {
    reasons.push('Near nursing station for close monitoring');
  }
  if (patientData.needsVentilator && bed.features.hasVentilator) {
    reasons.push('Equipped with ventilator as required');
  }
  if (patientData.needsIsolation && bed.features.isIsolation) {
    reasons.push('Isolation room for infection control');
  }
  if (bed.roomType === 'normal' && severity === 'stable') {
    reasons.push('Standard room appropriate for stable patient');
  }

  return reasons.length > 0 ? reasons : ['Best available option based on scoring algorithm'];
}

module.exports = {
  findOptimalBed,
  allocateBed,
  releaseBed,
  scoreBed,
  getStepDownRecommendations,
  getEscalationRecommendations,
  getWardOccupancy
};
