import client, { API_BASE_URL } from './client';

export const hospitalApi = {
  getCapacity: () => client.get('/hospital/capacity'),

  updateCapacity: (updateData) => client.put('/hospital/capacity', updateData),

  listProfiles: () => client.get('/hospital/profiles'),

  swapProfile: (hospitalId) =>
    client.post('/hospital/swap-profile', { hospital_id: hospitalId }),

  getHealth: () => client.get('/health', { baseURL: API_BASE_URL || '' }),
};

export default hospitalApi;
