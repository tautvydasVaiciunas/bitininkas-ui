import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapTaskFromApi,
  type Assignment,
  type AssignmentStatus,
  type Hive,
  type Task,
} from '@/lib/types';
import { resolveAssignmentUiStatus } from '@/lib/assignmentStatus';
import { Box, ListTodo, CheckCircle2, AlertCircle, MapPin, Calendar, ChevronRight } from 'lucide-react';

type NormalizedAssignment = {
  assignment: Assignment;
  hive?: Hive;
  task?: Task;
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading, isError } = useQuery<{
    hives: Hive[];
    assignments: NormalizedAssignment[];
    completionMap: Record<string, number>;
  }>({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const [hivesResponse, assignmentsResponse, tasksResponse] = await Promise.all([
        api.hives.list(),
        api.assignments.list(),
        api.tasks.list(),
      ]);

      const hives = hivesResponse.map(mapHiveFromApi);
      const assignments = assignmentsResponse.map(mapAssignmentFromApi);
      const tasks = tasksResponse.map(mapTaskFromApi);

      const hiveMap = new Map<string, Hive>(hives.map((hive) => [hive.id, hive]));
      const taskMap = new Map<string, Task>(tasks.map((task) => [task.id, task]));

      const normalizedAssignments = assignments.map((assignment) => {
        const hive = hiveMap.get(assignment.hiveId);
        const task = taskMap.get(assignment.taskId);
        return { assignment, hive, task };
      });

      const upcomingBase = normalizedAssignments
        .filter(({ assignment }) => assignment.status !== 'done')
        .sort((a, b) => new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime())
        .slice(0, 5);

      const detailsEntries = await Promise.all(
        upcomingBase.map(async ({ assignment }) => {
          try {
            const details = await api.assignments
              .details(assignment.id)
              .then(mapAssignmentDetailsFromApi);
            return [assignment.id, details.completion] as const;
          } catch (error) {
            console.error('Failed to load assignment details for dashboard', error);
            return [assignment.id, 0] as const;
          }
        })
      );

      const completionMap = Object.fromEntries(detailsEntries) as Record<string, number>;

      return { hives, assignments: normalizedAssignments, completionMap };
    },
  });

  const filteredHives = useMemo(() => {
    if (!data) return [] as Hive[];
    if (isAdmin) {
      return data.hives;
    }
    return data.hives.filter((hive) => hive.ownerUserId === user?.id);
  }, [data, isAdmin, user?.id]);

  const filteredAssignments = useMemo(() => {
    if (!data) return [] as typeof data.assignments;
    if (isAdmin) {
      return data.assignments;
    }
    return data.assignments.filter(({ assignment, hive }) => {
      if (assignment.createdByUserId && assignment.createdByUserId === user?.id) {
        return true;
      }
      if (hive?.ownerUserId && hive.ownerUserId === user?.id) {
        return true;
      }
      return false;
    });
  }, [data, isAdmin, user?.id]);

  const upcomingTasks = useMemo(() => {
    if (!data) return [] as typeof data.assignments;
    const assignments = filteredAssignments
      .filter(({ assignment }) => assignment.status !== 'done')
      .sort((a, b) => new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime())
      .slice(0, 5);

    return assignments.map((entry) => ({
      ...entry,
      completion: data.completionMap[entry.assignment.id] ?? 0,
    }));
  }, [data, filteredAssignments]);

  const stats = useMemo(() => {
    const totalHives = filteredHives.length;
    const totalAssignments = filteredAssignments.length;
    const completedAssignments = filteredAssignments.filter(({ assignment }) => assignment.status === 'done').length;
    const overdueAssignments = filteredAssignments.filter(({ assignment }) => {
      const uiStatus = resolveAssignmentUiStatus(assignment.status, assignment.dueDate);
      return uiStatus === 'overdue';
    }).length;

    return {
      totalHives,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
    };
  }, [filteredAssignments, filteredHives]);

  const assignmentsByHive = useMemo(() => {
    const map = new Map<string, number>();
    filteredAssignments.forEach(({ assignment }) => {
      const count = map.get(assignment.hiveId) ?? 0;
      if (assignment.status !== 'done') {
        map.set(assignment.hiveId, count + 1);
      }
    });
    return map;
  }, [filteredAssignments]);

  const getStatusBadge = (status: AssignmentStatus, dueDate: string) => {
    const uiStatus = resolveAssignmentUiStatus(status, dueDate);
    const variants: Record<string, { variant: 'default' | 'destructive' | 'success' | 'secondary'; label: string }> = {
      not_started: { variant: 'secondary', label: 'Nepradėta' },
      in_progress: { variant: 'default', label: 'Vykdoma' },
      done: { variant: 'success', label: 'Atlikta' },
      overdue: { variant: 'destructive', label: 'Vėluojama' },
    };

    const config =
      uiStatus === 'overdue'
        ? variants.overdue
        : variants[status] ?? { variant: 'secondary', label: status };

    return (
      <Badge
        variant={config.variant}
        className={config.variant === 'success' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
      >
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Sveiki, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Čia yra jūsų bitininkystės valdymo apžvalga
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aviliai
              </CardTitle>
              <Box className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalHives}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Viso užduočių
              </CardTitle>
              <ListTodo className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAssignments}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atlikta
              </CardTitle>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.completedAssignments}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vėluojama
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.overdueAssignments}</div>
            </CardContent>
          </Card>
        </div>

        {/* My Hives */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Mano aviliai</h2>
            <Button asChild variant="outline">
              <Link to="/hives">
                Visi aviliai
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <Card className="shadow-custom">
              <CardContent className="p-8 text-center text-muted-foreground">Kraunama...</CardContent>
            </Card>
          ) : isError ? (
            <Card className="shadow-custom">
              <CardContent className="p-8 text-center text-destructive">
                Nepavyko įkelti avilių duomenų. Pabandykite dar kartą.
              </CardContent>
            </Card>
          ) : filteredHives.length === 0 ? (
            <Card className="shadow-custom">
              <CardContent className="p-8 text-center text-muted-foreground">
                Šiuo metu neturite avilių
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHives.slice(0, 3).map((hive) => {
                const pendingCount = assignmentsByHive.get(hive.id) ?? 0;
                const badgeConfig: Record<typeof hive.status, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
                  active: { label: 'Aktyvus', variant: 'default' },
                  paused: { label: 'Pristabdyta', variant: 'secondary' },
                  archived: { label: 'Archyvuota', variant: 'secondary' },
                };

                const badge = badgeConfig[hive.status];

                return (
                  <Card key={hive.id} className="shadow-custom hover:shadow-custom-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{hive.label}</CardTitle>
                          {hive.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              {hive.location}
                            </div>
                          )}
                        </div>
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Sukurta:</span>
                          <span>{formatDate(hive.createdAt ?? new Date().toISOString())}</span>
                        </div>
                        {pendingCount === 0 ? (
                          <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-sm text-success">
                            Nėra laukiančių užduočių
                          </div>
                        ) : (
                          <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning-foreground">
                            {pendingCount} laukiančios užduotys
                          </div>
                        )}
                        <Button asChild variant="outline" className="w-full">
                          <Link to={`/hives/${hive.id}`}>Peržiūrėti</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Artėjančios užduotys</h2>
            <Button asChild variant="outline">
              <Link to="/tasks">
                Visos užduotys
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          <Card className="shadow-custom">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Kraunama...</div>
              ) : isError ? (
                <div className="p-8 text-center text-destructive">
                  Nepavyko įkelti užduočių. Pabandykite dar kartą.
                </div>
              ) : upcomingTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Šiuo metu nėra artėjančių užduočių
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingTasks.map(({ assignment, hive, task, completion }) => (
                    <div key={assignment.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{task?.title ?? 'Nežinoma užduotis'}</h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {hive && (
                              <div className="flex items-center gap-1">
                                <Box className="w-4 h-4 text-muted-foreground" />
                                <span>{hive.label}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Terminas: {formatDate(assignment.dueDate)}</span>
                              {resolveAssignmentUiStatus(assignment.status, assignment.dueDate) === 'overdue' && (
                                <Badge variant="destructive" className="ml-2">Vėluojama</Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progresas</span>
                              <span className="font-medium">{completion}%</span>
                            </div>
                            <Progress value={completion} className="h-2" />
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          {getStatusBadge(assignment.status, assignment.dueDate)}
                          <Button asChild size="sm">
                            <Link to={`/tasks/${assignment.id}/run`}>Vykdyti</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
