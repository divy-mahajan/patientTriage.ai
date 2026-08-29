import client from './client';

export const bedsApi = {
  recommendBed: (patientIdOrPayload, triageLevel, isHighRisk, complaint, symptoms = '', medicalHistory = '', requiredEquipment = []) => {
    let body = {};
    if (typeof patientIdOrPayload === 'object') {
      body = patientIdOrPayload;
    } else {
      body = {
        patient_id: patientIdOrPayload,
        predicted_triage_level: triageLevel,
        is_high_risk: isHighRisk,
        chief_complaint: complaint,
        symptoms,
        medical_history: medicalHistory,
        required_equipment: requiredEquipment,
      };
    }
    return client.post('/beds/recommend', body);
  },

  assignBed: (patientIdOrPayload, unitId, bedId) => {
    let body = {};
    if (typeof patientIdOrPayload === 'object') {
      body = patientIdOrPayload;
    } else {
      body = {
        patient_id: patientIdOrPayload,
        unit_id: unitId,
        bed_id: bedId,
      };
    }
    return client.post('/beds/assign', body);
  },

  releaseBed: (bedId, patientId = null, cleaningMinutes = 10, disposition = 'discharged') =>
    client.post('/beds/release', {
      bed_id: bedId,
      patient_id: patientId,
      cleaning_minutes: cleaningMinutes,
      disposition,
    }),

  completeCleaning: (bedId) =>
    client.post('/beds/complete-cleaning', {
      bed_id: bedId,
    }),
};

export default bedsApi;
