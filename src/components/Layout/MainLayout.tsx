import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';

interface MainLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export const MainLayout = ({ children, showBreadcrumbs = true }: MainLayoutProps) => {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="mt-4 text-sm font-medium">Atkuriama sesija...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="min-h-screen pt-6 pb-24 sm:pt-8 sm:pb-16 lg:pt-24 lg:pb-12 lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8">
          {showBreadcrumbs && <Breadcrumbs />}
          {children}
        </div>
      </main>
    </div>
  );
};
