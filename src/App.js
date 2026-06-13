import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AgentsPage from './pages/AgentsPage';
import MapPage from './pages/MapPage';
import AdminsPage from './pages/AdminsPage';
import ProfilePage from './pages/ProfilePage';
import { seedInitialAdmins } from './firebase/seed';
import './index.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  agents: 'Sales Agents',
  map: 'Map View',
  admins: 'Admin Users',
  profile: 'My Profile & Settings',
};

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--olive-dark)', flexDirection: 'column', gap: '16px'
      }}>
        <div className="spinner" style={{
          width: '36px', height: '36px',
          borderColor: 'rgba(255,255,255,0.25)',
          borderTopColor: 'white'
        }}></div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Loading...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  if (!userProfile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--olive-dark)', flexDirection: 'column', gap: '16px'
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
          Could not load your profile. Check your connection and try again.
        </span>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px', borderRadius: '8px', background: 'white',
            cursor: 'pointer', fontWeight: 500, border: 'none', fontSize: '13px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">{PAGE_TITLES[activePage]}</h1>
        </header>
        <main className="page-body">
          {activePage === 'dashboard' && <DashboardPage setActivePage={setActivePage} />}
          {activePage === 'agents' && <AgentsPage />}
          {activePage === 'map' && <MapPage />}
          {activePage === 'admins' && <AdminsPage />}
          {activePage === 'profile' && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}

// Run seed ONCE at app startup, outside of any React tree
seedInitialAdmins();

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff',
            color: '#1F2937',
            fontSize: '13.5px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}
