import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Box, 
  ListTodo, 
  Bell, 
  User, 
  Users, 
  UsersRound, 
  ListChecks, 
  ClipboardList, 
  FileStack 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;

  const navItems = [
    { to: '/', label: 'Apžvalga', icon: LayoutDashboard, show: true },
    { to: '/hives', label: 'Aviliai', icon: Box, show: true },
    { to: '/tasks', label: 'Užduotys', icon: ListTodo, show: true },
    { to: '/notifications', label: 'Pranešimai', icon: Bell, show: true },
    { to: '/profile', label: 'Profilis', icon: User, show: true },
  ];

  const adminItems = [
    { to: '/admin/users', label: 'Vartotojai', icon: Users, show: isAdmin },
    { to: '/admin/groups', label: 'Grupės', icon: UsersRound, show: isAdmin },
    { to: '/admin/steps', label: 'Žingsniai', icon: ListChecks, show: isAdmin },
    { to: '/admin/tasks', label: 'Užduotys', icon: ClipboardList, show: isAdmin },
    { to: '/admin/templates', label: 'Šablonai', icon: FileStack, show: isAdmin },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Box className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Bitininkas</h1>
            <p className="text-xs text-muted-foreground">Bitininkystės sistema</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.filter(item => item.show).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {isAdmin && adminItems.some(item => item.show) && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <div className="mb-2 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administravimas
              </p>
            </div>
            <div className="space-y-1">
              {adminItems.filter(item => item.show).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-center text-muted-foreground">
          Sukurta su ❤️ Lietuvoje
        </p>
      </div>
    </aside>
  );
};
