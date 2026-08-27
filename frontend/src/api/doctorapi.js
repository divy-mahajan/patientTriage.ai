import api from './client';

export const doctorsApi = {
  listDoctors: (params = {}) => api.get('/doctors', { params }),
  checkInDoctor: (data) => api.post('/doctors/check-in', data),
  assignDoctor: (data) => api.post('/doctors/assign', data),
};
