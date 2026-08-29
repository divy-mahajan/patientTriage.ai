import client from './client';

export const treatmentsApi = {
  getPatientTreatments: (patientId) =>
    client.get(`/treatments/patient/${encodeURIComponent(patientId)}`),

  addTreatment: (patientId, treatmentData) =>
    client.post(`/treatments/patient/${encodeURIComponent(patientId)}`, treatmentData),
};

export default treatmentsApi;
