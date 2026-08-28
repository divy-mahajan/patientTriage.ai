/**
 * PatientTriage.ai — Modular Centralized API Service Layer
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('pt_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Authentication API
 */
export const authAPI = {
  login: (clinician_id, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ clinician_id, password }),
    }),

  getMe: () =>
    request('/api/auth/me', {
      method: 'GET',
    }),

  logout: () =>
    request('/api/auth/logout', {
      method: 'POST',
    }),
};

/**
 * Patient Management API
 */
export const patientsAPI = {
  listPatients: (status = null) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/patients${query}`);
  },

  getPatient: (patientId) => request(`/api/patients/${encodeURIComponent(patientId)}`),

  intakePatient: (patientData) =>
    request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),
};

/**
 * ML Triage Assessment API
 */
export const triageAPI = {
  scorePatient: (patientIdOrData) => {
    let body = {};
    if (typeof patientIdOrData === 'string') {
      body = { patient_id: patientIdOrData };
    } else if (patientIdOrData?.patient_id && !patientIdOrData?.heart_rate) {
      body = { patient_id: patientIdOrData.patient_id };
    } else {
      body = { patient_data: patientIdOrData };
    }

    return request('/api/triage/score', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

/**
 * Hospital Capacity & Profile API
 */
export const hospitalAPI = {
  getCapacity: () => request('/api/hospital/capacity'),

  updateCapacity: (updateData) =>
    request('/api/hospital/capacity', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  listProfiles: () => request('/api/hospital/profiles'),

  swapProfile: (hospitalId) =>
    request('/api/hospital/swap-profile', {
      method: 'POST',
      body: JSON.stringify({ hospital_id: hospitalId }),
    }),
};

/**
 * Bed Recommendation & Assignment API
 */
export const bedsAPI = {
  recommendBed: (patientId, triageLevel, isHighRisk, complaint, symptoms = '', medicalHistory = '', requiredEquipment = []) =>
    request('/api/beds/recommend', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        predicted_triage_level: triageLevel,
        is_high_risk: isHighRisk,
        chief_complaint: complaint,
        symptoms: symptoms,
        medical_history: medicalHistory,
        required_equipment: requiredEquipment,
      }),
    }),

  assignBed: (patientId, unitId, bedId) =>
    request('/api/beds/assign', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        unit_id: unitId,
        bed_id: bedId,
      }),
    }),

  releaseBed: (bedId, patientId = null, cleaningMinutes = 10, disposition = 'discharged') =>
    request('/api/beds/release', {
      method: 'POST',
      body: JSON.stringify({
        bed_id: bedId,
        patient_id: patientId,
        cleaning_minutes: cleaningMinutes,
        disposition,
      }),
    }),

  completeCleaning: (bedId) =>
    request('/api/beds/complete-cleaning', {
      method: 'POST',
      body: JSON.stringify({
        bed_id: bedId,
      }),
    }),
};

/**
 * Patient Treatments & Prescriptions API
 */
export const treatmentsAPI = {
  getPatientTreatments: (patientId) => request(`/api/treatments/patient/${encodeURIComponent(patientId)}`),

  addTreatment: (patientId, treatmentData) =>
    request(`/api/treatments/patient/${encodeURIComponent(patientId)}`, {
      method: 'POST',
      body: JSON.stringify(treatmentData),
    }),
};

/**
 * Doctor Roster & Assignment API
 */
export const doctorsAPI = {
  listRoster: (specialty = null, availableOnly = false) => {
    const params = new URLSearchParams();
    if (specialty) params.append('specialty', specialty);
    if (availableOnly) params.append('available_only', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/doctors${query}`);
  },

  checkInDoctor: (doctorData) =>
    request('/api/doctors/check-in', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    }),

  assignDoctor: (patientId, triageLevel, complaint) =>
    request('/api/doctors/assign', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        predicted_triage_level: triageLevel,
        chief_complaint: complaint,
      }),
    }),
};

/**
 * Diagnostic Tests Suggestion API
 */
export const testsAPI = {
  suggestTests: (patientId, complaint, symptoms = '', history = '') =>
    request('/api/tests/recommend', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        chief_complaint: complaint,
        symptoms,
        medical_history: history,
      }),
    }),
};

/**
 * Surge Management API
 */
export const surgeAPI = {
  getSurgeStatus: async () => {
    try {
      const cap = await hospitalAPI.getCapacity();
      return {
        status: cap?.surge_status || 'normal',
        is_surge_active: cap?.surge_status === 'critical' || cap?.surge_status === 'tier_2',
        surge_tier: cap?.surge_status || 'normal',
      };
    } catch {
      return { status: 'normal', is_surge_active: false, surge_tier: 'normal' };
    }
  },

  toggleSurgeMode: async (isActive, reason = '') => {
    const tier = typeof isActive === 'string' ? isActive : (isActive ? 'critical' : 'normal');
    const updated = await hospitalAPI.updateCapacity({ surge_status: tier });
    return {
      success: true,
      is_surge_active: tier !== 'normal',
      surge_tier: updated?.surge_status || tier,
      reason,
    };
  },
};

/**
 * Real-Time Patient Reassessment & Monitoring API
 */
export const reassessmentAPI = {
  getStatus: (patientId) => request(`/api/reassessment/status/${encodeURIComponent(patientId)}`),

  recordVitals: (patientId, vitalsData) =>
    request(`/api/reassessment/vitals/${encodeURIComponent(patientId)}`, {
      method: 'POST',
      body: JSON.stringify(vitalsData),
    }),

  overrideAssessment: (patientId, overrideData) =>
    request(`/api/reassessment/override/${encodeURIComponent(patientId)}`, {
      method: 'POST',
      body: JSON.stringify(overrideData),
    }),

  getHistory: (patientId) => request(`/api/reassessment/history/${encodeURIComponent(patientId)}`),

  getAlerts: () => request('/api/reassessment/alerts'),
};

/**
 * Audit Log API
 */
export const auditAPI = {
  listLogs: (patientId = null, eventType = null) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (eventType) params.append('event_type', eventType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/audit${query}`);
  },
};

export default {
  auth: authAPI,
  patients: patientsAPI,
  triage: triageAPI,
  hospital: hospitalAPI,
  beds: bedsAPI,
  doctors: doctorsAPI,
  tests: testsAPI,
  surge: surgeAPI,
  reassessment: reassessmentAPI,
  audit: auditAPI,
  treatments: treatmentsAPI,
};
