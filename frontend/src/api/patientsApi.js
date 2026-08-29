import client from './client';

export const patientsApi = {
  listPatients: (params = {}) => client.get('/patients', { params }),

  getPatient: (patientId) => client.get(`/patients/${encodeURIComponent(patientId)}`),

  createPatient: (data) => client.post('/patients', data),

  intakePatient: (data) => client.post('/patients', data),
};

export default patientsApi;
