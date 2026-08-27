import api from './client';
import axios from 'axios';

export const hospitalApi = {
  getCapacity: () => api.get('/hospital/capacity'),
  updateCapacity: (updateData) => api.put('/hospital/capacity', updateData),
  swapProfile: (hospitalId) => api.post('/hospital/swap-profile', { hospital_id: hospitalId }),
  getHealth: () => axios.get('/health').then(res => res.data),
};
