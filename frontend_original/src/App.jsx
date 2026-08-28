import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientIntakePage from './pages/PatientIntakePage';
import TriageAssessmentPage from './pages/TriageAssessmentPage';
import BedMapPage from './pages/BedMapPage';
import DoctorCheckInPage from './pages/DoctorCheckInPage';
import SurgeModePage from './pages/SurgeModePage';
import AuditLogPage from './pages/AuditLogPage';
import { authAPI } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);
  const [currentClinician, setCurrentClinician] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Collapsed by default as requested

  // Strict backend token validation on mount
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem('pt_token');

      if (!savedToken) {
        setIsAuthenticated(false);
        setIsVerifyingAuth(false);
        return;
      }

      try {
        // Validate token cryptographically with FastAPI backend
        const verifiedClinician = await authAPI.getMe();
        setCurrentClinician(verifiedClinician);
        setIsAuthenticated(true);
      } catch (err) {
        // Invalid, tampered, or expired token -> clear and lock down
        localStorage.removeItem('pt_token');
        localStorage.removeItem('pt_clinician');
        setIsAuthenticated(false);
        setCurrentClinician(null);
      } finally {
        setIsVerifyingAuth(false);
      }
    };

    verifySession();
  }, []);

  const handleLoginSuccess = (clinician) => {
    setCurrentClinician(clinician);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Clean up even if network error
    } finally {
      localStorage.removeItem('pt_token');
      localStorage.removeItem('pt_clinician');
      setIsAuthenticated(false);
      setCurrentClinician(null);
      setCurrentScreen('dashboard');
    }
  };

  const handleNewPatientClick = () => {
    setCurrentScreen('intake');
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setCurrentScreen('assessment');
  };

  const handleIntakeSubmit = (savedPatient) => {
    setSelectedPatient(savedPatient);
    setCurrentScreen('assessment');
  };

  const handleAcceptAssignment = () => {
    setCurrentScreen('dashboard');
  };

  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-border/80 shadow-lg animate-fade-in">
          <div className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold text-text-secondary tracking-wide">
            Verifying Clinician Session...
          </span>
        </div>
      </div>
    );
  }

  // If not authenticated, render the clinician login screen
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Collapsible Sliding Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={(screenId) => setCurrentScreen(screenId)}
        isOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
      />

      {/* Dynamic Header */}
      <Header
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        currentClinician={currentClinician}
        onSignOut={handleSignOut}
      />

      {/* Main Screen Canvas shifting with drawer state */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ease-in-out ${
          isDrawerOpen ? 'ml-64' : 'ml-18'
        }`}
      >
        <div className="p-6 sm:p-8 max-w-[1440px] mx-auto">
          {currentScreen === 'dashboard' && (
            <DashboardPage
              onNewPatient={handleNewPatientClick}
              onSelectPatient={handlePatientSelect}
            />
          )}

          {currentScreen === 'intake' && (
            <PatientIntakePage
              onBack={() => setCurrentScreen('dashboard')}
              onSubmitIntake={handleIntakeSubmit}
            />
          )}

          {currentScreen === 'assessment' && (
            <TriageAssessmentPage
              patient={selectedPatient}
              onAcceptAssignment={handleAcceptAssignment}
              onBackToQueue={() => setCurrentScreen('dashboard')}
            />
          )}

          {currentScreen === 'beds' && (
            <BedMapPage
              onSelectPatient={handlePatientSelect}
              onNavigate={(screenId) => setCurrentScreen(screenId)}
            />
          )}

          {currentScreen === 'doctors' && <DoctorCheckInPage />}

          {currentScreen === 'surge' && <SurgeModePage />}

          {currentScreen === 'audit' && <AuditLogPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
