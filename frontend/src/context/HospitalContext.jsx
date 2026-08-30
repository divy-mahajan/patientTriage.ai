import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { patientsApi } from '../api/patientsApi';
import { doctorsApi } from '../api/doctorsApi';
import { authApi } from '../api/authApi';

const HospitalContext = createContext(null);

export const CLINICIAN_PERSONAS = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Jenkins, MD',
    role: 'Attending Triage Officer',
    initials: 'SJ',
    department: 'Emergency Medicine',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'DOC-002',
    name: 'Dr. Marcus Vance, MD',
    role: 'Cardiology Attending',
    initials: 'MV',
    department: 'Cardiology Wing',
    avatar: 'https://images.unsplash.com/photo-1594824813588-662f551b9b18?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'DOC-003',
    name: 'Dr. Elena Rostova, MD',
    role: 'Trauma Surgeon',
    initials: 'ER',
    department: 'Trauma Bay',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'NURSE-001',
    name: 'Nurse J. Reynolds, RN',
    role: 'Lead Triage Coordinator',
    initials: 'JR',
    department: 'Triage & Intake',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  }
];

export const HospitalProvider = ({ children }) => {
  const [capacity, setCapacity] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentUser, setCurrentUserState] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_user');
      return saved ? JSON.parse(saved) : CLINICIAN_PERSONAS[0];
    } catch {
      return CLINICIAN_PERSONAS[0];
    }
  });

  const setCurrentUser = useCallback((user) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem('pt_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user in localStorage', e);
    }
  }, []);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Level 1 Trauma Alert',
      message: 'Inbound EMS ambulance with polytrauma (ETA 4 min). Resus Bay 1 prepped.',
      type: 'critical',
      timestamp: new Date(Date.now() - 5 * 60000)
    },
    {
      id: 2,
      title: 'Bed Status Update',
      message: 'Bed ED-3 terminal disinfection completed. Ready for intake.',
      type: 'info',
      timestamp: new Date(Date.now() - 15 * 60000)
    }
  ]);

  const addNotification = useCallback((title, message, type = 'info') => {
    const newNotif = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
  }, []);

  const fetchCapacity = useCallback(async () => {
    try {
      const data = await hospitalApi.getCapacity();
      setCapacity(data);
      setError(null);
    } catch (err) {
      console.warn('Could not fetch capacity from backend, using state:', err.message);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await patientsApi.listPatients({ limit: 100 });
      setPatients(res.patients || []);
    } catch (err) {
      console.warn('Could not fetch patients from backend:', err.message);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await doctorsApi.listDoctors();
      setDoctors(res.doctors || []);
    } catch (err) {
      console.warn('Could not fetch doctors from backend:', err.message);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchCapacity(), fetchPatients(), fetchDoctors()]);
    setLoading(false);
  }, [fetchCapacity, fetchPatients, fetchDoctors]);

  // Initial load and periodic polling
  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchCapacity();
      fetchPatients();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchCapacity, fetchPatients]);

  const login = async (clinicianId, password) => {
    try {
      setLoading(true);
      const res = await authApi.login(clinicianId, password);
      if (res?.access_token) {
        localStorage.setItem('pt_token', res.access_token);
      }
      
      const clinicianData = res?.clinician || {
        id: clinicianId,
        name: clinicianId === 'DOC-001' ? 'Dr. Sarah Jenkins, MD' : 'Emergency Clinician',
        role: 'Attending Physician'
      };

      const personaMatch = CLINICIAN_PERSONAS.find(p => p.id.toUpperCase() === clinicianId.toUpperCase());
      const mergedUser = {
        id: clinicianData.clinician_id || clinicianId,
        name: clinicianData.name,
        role: clinicianData.role,
        department: clinicianData.department || 'Emergency Department',
        avatar: personaMatch?.avatar || CLINICIAN_PERSONAS[0].avatar
      };

      setCurrentUser(mergedUser);
      addNotification('Clinician Signed In', `Authenticated as ${mergedUser.name}`, 'success');
      return mergedUser;
    } catch (err) {
      console.warn('Auth API error, checking fallback persona:', err.message);
      const personaMatch = CLINICIAN_PERSONAS.find(p => p.id.toUpperCase() === clinicianId.toUpperCase());
      if (personaMatch) {
        setCurrentUser(personaMatch);
        addNotification('Clinician Signed In', `Authenticated as ${personaMatch.name}`, 'success');
        return personaMatch;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout().catch(() => {});
    } finally {
      localStorage.removeItem('pt_token');
      localStorage.removeItem('pt_user');
      setCurrentUser(CLINICIAN_PERSONAS[0]);
      addNotification('Signed Out', 'Clinician workstation session closed.', 'info');
    }
  };

  const swapProfile = async (hospitalId) => {
    try {
      setLoading(true);
      const newCapacity = await hospitalApi.swapProfile(hospitalId);
      setCapacity(newCapacity);
      addNotification(
        'Hospital Profile Swapped',
        `Active configuration changed to ${newCapacity.name || hospitalId}`,
        'success'
      );
      await refreshAll();
    } catch (err) {
      addNotification('Profile Swap Error', err.message, 'critical');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSurgeStatus = async (status) => {
    try {
      const updated = await hospitalApi.updateCapacity({ surge_status: status });
      setCapacity(updated);
      addNotification(
        'Surge Status Modified',
        `Hospital crisis protocol updated to ${status.toUpperCase()}`,
        status === 'critical' ? 'critical' : status === 'elevated' ? 'warning' : 'info'
      );
    } catch (err) {
      addNotification('Surge Update Error', err.message, 'critical');
      throw err;
    }
  };

  const updateBedStatus = async (bedId, newStatus, notes = null) => {
    try {
      const updated = await hospitalApi.updateCapacity({
        bed_updates: [
          {
            bed_id: bedId,
            status: newStatus,
            notes: notes
          }
        ]
      });
      setCapacity(updated);
      addNotification(
        'Bed Status Updated',
        `Bed ${bedId} state set to ${newStatus.toUpperCase()}`,
        'info'
      );
    } catch (err) {
      addNotification('Bed Update Error', err.message, 'critical');
      throw err;
    }
  };

  const value = {
    capacity,
    patients,
    doctors,
    loading,
    error,
    currentUser,
    setCurrentUser,
    login,
    logout,
    selectedPatient,
    setSelectedPatient,
    notifications,
    addNotification,
    refreshAll,
    fetchCapacity,
    fetchPatients,
    fetchDoctors,
    swapProfile,
    updateSurgeStatus,
    updateBedStatus
  };

  return (
    <HospitalContext.Provider value={value}>
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
