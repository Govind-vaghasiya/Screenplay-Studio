// App layout wrapper — sidebar + main content area
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/stores/appStore';
import './AppLayout.css';

export function AppLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'app-layout-collapsed' : ''}`}>
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
