import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { patientsApi } from '../api/patientsApi';
import { doctorsApi } from '../api/doctorsApi';

const HospitalContext = createContext(null);

export const CLINICIAN_PERSONAS = [
  {
    id: 'DOC-001',
    name: 'Dr. Arjun Mehta',
    role: 'Attending Physician, ER',
    initials: 'AM',
    department: 'Emergency Medicine',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'DOC-005',
    name: 'Dr. Priya Shah',
    role: 'Pediatric & Emergency Specialist',
    initials: 'PS',
    department: 'Emergency / Pediatrics',
    avatar: 'https://images.unsplash.com/photo-1594824813588-662f551b9b18?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'NURSE-001',
    name: 'Sarah Jenkins, RN',
    role: 'Lead Triage Coordinator',
    initials: 'SJ',
    department: 'Triage & Intake',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'
  }
];

export const HospitalProvider = ({ children }) => {
  const [capacity, setCapacity] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(CLINICIAN_PERSONAS[0]);
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
