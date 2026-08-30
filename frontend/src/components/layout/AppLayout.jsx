import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNavBar } from './SideNavBar';
import { TopNavBar } from './TopNavBar';
import { SurgeBanner } from './SurgeBanner';

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('pt_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pt_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Collapsible Side Navigation Bar */}
      <SideNavBar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      {/* Main Content Area with dynamic margin based on sidebar state */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'ml-[72px]' : 'ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <TopNavBar isCollapsed={isCollapsed} onToggleSidebar={toggleSidebar} />

        {/* Global Surge Alert Banner */}
        <SurgeBanner />

        {/* Dynamic Page Routed Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
