import api from './client';

export const triageApi = {
  scorePatient: ({ patientId, patientData }) => {
    const payload = {};
    if (patientId) payload.patient_id = patientId;
    if (patientData) payload.patient_data = patientData;
    return api.post('/triage/score', payload);
  },
};
