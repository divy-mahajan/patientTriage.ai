import client from './client';

export const hospitalApi = {
  getCapacity: () => client.get('/hospital/capacity'),

  updateCapacity: (updateData) => client.put('/hospital/capacity', updateData),

  listProfiles: () => client.get('/hospital/profiles'),

  swapProfile: (hospitalId) =>
    client.post('/hospital/swap-profile', { hospital_id: hospitalId }),

  getHealth: () => client.get('/health', { baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000' }),
};

export default hospitalApi;
