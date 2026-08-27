import api from './client';

export const patientsApi = {
  createPatient: (data) => api.post('/patients', data),
  listPatients: (params = {}) => api.get('/patients', { params }),
  getPatient: (patientId) => api.get(`/patients/${encodeURIComponent(patientId)}`),
};
