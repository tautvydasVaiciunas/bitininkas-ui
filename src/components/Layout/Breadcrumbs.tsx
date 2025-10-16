import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Fragment, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { Assignment, AssignmentDetails, Hive, PaginatedNews, Task } from '@/lib/types';

const routeLabels: Record<string, string> = {
  '': 'Naujienos',
  news: 'Naujienos',
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

  const getTaskLabel = useCallback(
    (segment: string) => {
      const cachedDetail = queryClient.getQueryData<AssignmentDetails>([
        'assignments',
        segment,
        'details',
      ]);

      if (cachedDetail?.task?.title) {
        return cachedDetail.task.title;
      }

      const cachedLists = queryClient.getQueriesData<{
        assignments?: Assignment[];
        tasks?: Task[];
      }>({ queryKey: ['assignments'] });

      for (const [, data] of cachedLists) {
        if (!data?.assignments?.length) continue;

        const foundAssignment = data.assignments.find((item) => item.id === segment);
        if (!foundAssignment) continue;

        if (data.tasks?.length) {
          const matchedTask = data.tasks.find((task) => task.id === foundAssignment.taskId);
          if (matchedTask?.title) {
            return matchedTask.title;
          }
        }

        break;
      }

      return undefined;
    },
    [queryClient]
  );

  const getNewsLabel = useCallback(
    (segment: string) => {
      const cached = queryClient.getQueryData<InfiniteData<PaginatedNews>>([
        'news',
        'list',
      ]);

      if (cached?.pages) {
        for (const page of cached.pages) {
          const found = page.items.find((item) => item.id === segment);
          if (found) {
            return found.title;
          }
        }
      }

      return undefined;
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

        if (!label && previous === 'news') {
          label = getNewsLabel(segment) ?? 'Naujiena';
        }

        if (!label && previous === 'tasks') {
          label = getTaskLabel(segment) ?? 'Užduotis';
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
    [getHiveLabel, getNewsLabel, getTaskLabel, pathSegments]
  );

  if (pathSegments.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link to="/news" className="hover:text-foreground transition-colors">
        Naujienos
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
