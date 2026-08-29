import client from './client';

export const doctorsApi = {
  listDoctors: (params = {}) => client.get('/doctors', { params }),

  listRoster: (specialty = null, availableOnly = false) => {
    const params = {};
    if (specialty) params.specialty = specialty;
    if (availableOnly) params.available_only = 'true';
    return client.get('/doctors', { params });
  },

  checkInDoctor: (doctorData) => client.post('/doctors/check-in', doctorData),

  assignDoctor: (patientIdOrPayload, triageLevel, complaint, age = null) => {
    let body = {};
    if (typeof patientIdOrPayload === 'object') {
      body = patientIdOrPayload;
    } else {
      body = {
        patient_id: patientIdOrPayload,
        predicted_triage_level: triageLevel,
        chief_complaint: complaint,
        age: age ? parseInt(age) : null,
      };
    }
    return client.post('/doctors/assign', body);
  },
};

export default doctorsApi;
