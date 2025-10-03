import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';

interface MainLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export const MainLayout = ({ children, showBreadcrumbs = true }: MainLayoutProps) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8">
          {showBreadcrumbs && <Breadcrumbs />}
          {children}
        </div>
      </main>
    </div>
  );
};
