// Sidebar navigation component
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/appStore';
import {
  IconHome,
  IconFolder,
  IconClapperboard,
  IconSettings,
  IconLogOut,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/common/Icons';
import './Sidebar.css';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <IconClapperboard size={24} color="var(--color-accent-400)" />
        {!sidebarCollapsed && <span className="sidebar-logo-text">Screenplay Studio</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <IconHome size={18} />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink to="/project/project-demo-signal/breakdown" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <IconFolder size={18} />
          {!sidebarCollapsed && <span>Breakdown Engine</span>}
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <IconSettings size={18} />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        {/* User Profile */}
        {user && (
          <div className="sidebar-user">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="sidebar-user-avatar" />
            ) : (
              <div className="sidebar-user-avatar sidebar-user-avatar-placeholder">
                {user.displayName?.[0] ?? user.email?.[0] ?? '?'}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name truncate">{user.displayName ?? 'User'}</span>
                <span className="sidebar-user-email truncate">{user.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button className="sidebar-link sidebar-link-danger" onClick={logout}>
          <IconLogOut size={18} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
