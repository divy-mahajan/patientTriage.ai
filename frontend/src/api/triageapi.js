import client from './client';

export const triageApi = {
  scorePatient: (patientIdOrData) => {
    let body = {};
    if (typeof patientIdOrData === 'string') {
      body = { patient_id: patientIdOrData };
    } else if (patientIdOrData?.patient_id && !patientIdOrData?.heart_rate) {
      body = { patient_id: patientIdOrData.patient_id };
    } else if (patientIdOrData?.patientId) {
      body = { patient_id: patientIdOrData.patientId };
    } else {
      body = { patient_data: patientIdOrData };
    }
    return client.post('/triage/score', body);
  },
};

export default triageApi;
