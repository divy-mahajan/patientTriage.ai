import api from './client';

export const bedsApi = {
  recommendBed: (data) => api.post('/beds/recommend', data),
  assignBed: (data) => api.post('/beds/assign', data),
};
