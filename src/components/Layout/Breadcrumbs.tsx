import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

const routeLabels: Record<string, string> = {
  '': 'Apžvalga',
  hives: 'Aviliai',
  tasks: 'Užduotys',
  notifications: 'Pranešimai',
  profile: 'Profilis',
  admin: 'Administravimas',
  users: 'Vartotojai',
  groups: 'Grupės',
  steps: 'Žingsniai',
  templates: 'Šablonai',
  run: 'Vykdymas',
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment;
    const isLast = index === pathSegments.length - 1;

    return {
      path,
      label,
      isLast,
    };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link to="/" className="hover:text-foreground transition-colors">
        Apžvalga
      </Link>
      {breadcrumbs.map((crumb) => (
        <Fragment key={crumb.path}>
          <ChevronRight className="w-4 h-4" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
};
