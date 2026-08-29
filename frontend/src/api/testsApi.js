import client from './client';

export const testsApi = {
  recommendTests: (patientIdOrPayload, complaint, symptoms = '', history = '') => {
    let body = {};
    if (typeof patientIdOrPayload === 'object') {
      body = patientIdOrPayload;
    } else {
      body = {
        patient_id: patientIdOrPayload,
        chief_complaint: complaint,
        symptoms,
        medical_history: history,
      };
    }
    return client.post('/tests/recommend', body);
  },

  suggestTests: (patientIdOrPayload, complaint, symptoms = '', history = '') =>
    testsApi.recommendTests(patientIdOrPayload, complaint, symptoms, history),
};

export default testsApi;
