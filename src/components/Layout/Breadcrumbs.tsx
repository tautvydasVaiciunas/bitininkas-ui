import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Fragment, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Hive } from '@/lib/types';

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

const formatIdentifier = (value: string) => `HIVE-${value.slice(0, 8).toUpperCase()}`;

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const queryClient = useQueryClient();

  const getHiveLabel = useCallback(
    (segment: string) => {
      const cachedDetail = queryClient.getQueryData<{ hive: Hive }>(['hive', segment]);
      if (cachedDetail?.hive?.label) {
        return cachedDetail.hive.label;
      }

      const cachedList = queryClient.getQueryData<Hive[]>(['hives']);
      const matched = cachedList?.find((item) => item.id === segment);
      return matched?.label;
    },
    [queryClient]
  );

  const breadcrumbs = useMemo(
    () =>
      pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;

        const previous = pathSegments[index - 1];
        let label = routeLabels[segment];

        if (!label && previous === 'hives') {
          label = getHiveLabel(segment) ?? formatIdentifier(segment);
        }

        if (!label) {
          label = routeLabels[segment] || segment;
        }

        return {
          path,
          label,
          isLast,
        };
      }),
    [getHiveLabel, pathSegments]
  );

  if (pathSegments.length === 0) {
    return null;
  }

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
