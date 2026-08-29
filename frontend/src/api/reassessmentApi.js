import client from './client';

export const reassessmentApi = {
  getStatus: (patientId) => client.get(`/reassessment/status/${encodeURIComponent(patientId)}`),

  recordVitals: (patientId, vitalsData) =>
    client.post(`/reassessment/vitals/${encodeURIComponent(patientId)}`, vitalsData),

  overrideAssessment: (patientId, overrideData) =>
    client.post(`/reassessment/override/${encodeURIComponent(patientId)}`, overrideData),

  getHistory: (patientId) => client.get(`/reassessment/history/${encodeURIComponent(patientId)}`),

  getAlerts: () => client.get('/reassessment/alerts'),
};

export default reassessmentApi;
