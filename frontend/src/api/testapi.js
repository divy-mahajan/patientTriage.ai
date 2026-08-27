import api from './client';

export const testsApi = {
  recommendTests: (data) => api.post('/tests/recommend', data),
};
