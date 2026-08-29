import client from './client';

export const auditApi = {
  listLogs: (patientId = null, eventType = null) => {
    const params = {};
    if (patientId) params.patient_id = patientId;
    if (eventType) params.event_type = eventType;
    return client.get('/audit', { params });
  },
};

export default auditApi;
