import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, Users, Map, LayoutDashboard, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { getInitials } from '../utils/agentUtils';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Sales Agents', icon: Users },
  { id: 'map', label: 'Map View', icon: Map },
];

const adminItems = [
  { id: 'admins', label: 'Admin Users', icon: ShieldCheck },
  { id: 'profile', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage }) {
  const { userProfile, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="logo-icon">
            <Leaf size={20} color="white" />
          </div>
          <div className="logo-text">
            <div className="brand">Herbalife</div>
            <div className="sub">Pharmaceuticals</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <item.icon size={17} />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="nav-section-label" style={{ marginTop: '16px' }}>Administration</div>
        {adminItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <item.icon size={17} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {getInitials(userProfile?.firstName, userProfile?.lastName)}
          </div>
          <div className="sidebar-user-info">
            <div className="name">{userProfile?.firstName} {userProfile?.lastName}</div>
            <div className="role">{userProfile?.role || 'admin'}</div>
          </div>
        </div>
        <button className="nav-item" onClick={logout} style={{ marginTop: '4px' }}>
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
