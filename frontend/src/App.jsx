import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HospitalProvider } from './context/HospitalContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import IntakePage from './pages/IntakePage';
import AssessmentPage from './pages/AssessmentPage';
import BedMapPage from './pages/BedMapPage';
import DoctorsPage from './pages/DoctorsPage';
import SurgePage from './pages/SurgePage';
import AuditPage from './pages/AuditPage';
import LoginPage from './pages/LoginPage';

export const App = () => {
  return (
    <HospitalProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone Login Screen */}
          <Route path="/login" element={<LoginPage />} />

          {/* Main App Layout */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="intake" element={<IntakePage />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="assessment/:patientId" element={<AssessmentPage />} />
            <Route path="beds" element={<BedMapPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="surge" element={<SurgePage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HospitalProvider>
  );
};

export default App;
