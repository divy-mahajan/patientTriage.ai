import client from './client';

export const authApi = {
  login: (clinician_id, password) =>
    client.post('/auth/login', { clinician_id, password }),

  getMe: () => client.get('/auth/me'),

  logout: () => client.post('/auth/logout'),
};

export default authApi;
