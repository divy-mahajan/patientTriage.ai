export * from './client';
export * from './authApi';
export * from './patientsApi';
export * from './triageApi';
export * from './hospitalApi';
export * from './bedsApi';
export * from './doctorsApi';
export * from './testsApi';
export * from './surgeApi';
export * from './reassessmentApi';
export * from './auditApi';
export * from './treatmentsApi';

// Default bundle export
import client from './client';
import authApi from './authApi';
import patientsApi from './patientsApi';
import triageApi from './triageApi';
import hospitalApi from './hospitalApi';
import bedsApi from './bedsApi';
import doctorsApi from './doctorsApi';
import testsApi from './testsApi';
import surgeApi from './surgeApi';
import reassessmentApi from './reassessmentApi';
import auditApi from './auditApi';
import treatmentsApi from './treatmentsApi';

export default {
  client,
  auth: authApi,
  patients: patientsApi,
  triage: triageApi,
  hospital: hospitalApi,
  beds: bedsApi,
  doctors: doctorsApi,
  tests: testsApi,
  surge: surgeApi,
  reassessment: reassessmentApi,
  audit: auditApi,
  treatments: treatmentsApi,
};
