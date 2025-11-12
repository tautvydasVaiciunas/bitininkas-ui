import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import api, { HttpError, type AdminUserResponse, type HiveHistoryEventResponse } from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapTaskFromApi,
  type Assignment,
  type AssignmentStatus,
  type Hive,
  type HiveTag,
  type Task,
  type UpdateHivePayload,
} from '@/lib/types';
import { resolveAssignmentUiStatus } from '@/lib/assignmentStatus';
import { MapPin, Calendar, Edit, Archive, Box, ChevronRight, Loader2, Tag as TagIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { UserMultiSelect, type MultiSelectOption } from '@/components/UserMultiSelect';
import { TagSelect } from '@/components/TagSelect';

type EditFormState = {
  label: string;
  location: string;
  tagId: string | null;
  members: string[];
};

type HiveHistoryResponse = {
  data: HiveHistoryEventResponse[];
  page: number;
  limit: number;
  total: number;
};

export default function HiveDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{
    hive: Hive;
    assignments: { assignment: Assignment; task: Task | null; completion: number }[];
  }>({
    queryKey: ['hive', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing hive id');
      }

      const [hiveResponse, assignmentsResponse, tasksResponse] = await Promise.all([
        api.hives.details(id),
        api.assignments.list({ hiveId: id }),
        api.tasks.list(),
      ]);

      const hive = mapHiveFromApi(hiveResponse);
      const assignments = assignmentsResponse.map(mapAssignmentFromApi);
      const tasks = tasksResponse.map(mapTaskFromApi);

      const taskMap = new Map<string, Task>(tasks.map((task) => [task.id, task]));

      const assignmentEntries = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const details = await api.assignments
              .details(assignment.id)
              .then(mapAssignmentDetailsFromApi);
            return {
              assignment,
              task: details.task ?? taskMap.get(assignment.taskId) ?? null,
              completion: details.completion,
            };
          } catch (error) {
            console.error('Failed to fetch assignment details for hive', error);
            return {
              assignment,
              task: taskMap.get(assignment.taskId) ?? null,
              completion: 0,
            };
          }
        })
      );

      return { hive, assignments: assignmentEntries };
    },
  });

  const hive = data?.hive;
  const historyItems = historyData?.data ?? [];
  const historyTotalPages = historyData ? Math.max(1, Math.ceil(historyData.total / historyData.limit)) : 1;
  const currentHistoryPage = historyData?.page ?? historyPage;

  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'settings'>('tasks');
  const historyPageSize = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const [editForm, setEditForm] = useState<EditFormState>({
    label: '',
    location: '',
    tagId: null,
    members: [] as string[],
  });

  useEffect(() => {
    setHistoryPage(1);
  }, [id]);

  const canManageMembers = user?.role === 'admin' || user?.role === 'manager';

  const { data: users = [] } = useQuery<AdminUserResponse[]>({
    queryKey: ['users', 'all'],
    queryFn: () => api.users.list(),
    enabled: canManageMembers,
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery<HiveTag[]>({
    queryKey: ['hive-tags', 'all'],
    queryFn: () => api.hiveTags.list(),
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.hiveTags.create({ name }),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ['hive-tags', 'all'] });
      setEditForm((prev) => ({ ...prev, tagId: tag.id }));
      toast({
        title: 'Žyma sukurta',
        description: `Žyma „${tag.name}“ sėkmingai pridėta.`,
      });
    },
    onError: (error: unknown) => {
      const description = error instanceof HttpError ? error.message : error instanceof Error ? error.message : undefined;
      toast({
        title: 'Nepavyko sukurti žymos',
        description,
        variant: 'destructive',
      });
    },
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    isFetching: historyFetching,
  } = useQuery<HiveHistoryResponse>({
    queryKey: ['hive-history', id, historyPage],
    enabled: !!id && activeTab === 'history',
    keepPreviousData: true,
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing hive id');
      }
      return api.hives.history(id, { page: historyPage, limit: historyPageSize });
    },
  });

  const memberOptions: MultiSelectOption[] = useMemo(() => {
    if (!users.length) return [];
    return users.map((item) => ({
      value: item.id,
      label: item.name || item.email,
      description: item.name ? item.email : undefined,
    }));
  }, [users]);

  useEffect(() => {
    if (!hive) return;
    setEditForm({
      label: hive.label,
      location: hive.location ?? '',
      tagId: hive.tag?.id ?? null,
      members: hive.members.map((member) => member.id),
    });
  }, [hive]);

  const resetEditForm = () => {
    if (!hive) return;
    setEditForm({
      label: hive.label,
      location: hive.location ?? '',
      tagId: hive.tag?.id ?? null,
      members: hive.members.map((member) => member.id),
    });
  };

  const assignments = useMemo(() => data?.assignments ?? [], [data]);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatMonthYear = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long' });
};

  const friendlyId = hive ? `HIVE-${hive.id.slice(0, 8).toUpperCase()}` : '';
  const showFriendlyId = import.meta.env.MODE === 'development';

  const updateHiveMutation = useMutation<Hive, HttpError | Error, UpdateHivePayload>({
    mutationFn: async (payload) => {
      if (!hive?.id) {
        throw new Error('Hive not loaded');
      }
      return api.hives.update(hive.id, payload).then(mapHiveFromApi);
    },
    onSuccess: (updatedHive) => {
      queryClient.setQueryData<
        { hive: Hive; assignments: { assignment: Assignment; task: Task | null; completion: number }[] } | undefined
      >(['hive', id], (old) => {
        if (!old) return old;
        return { ...old, hive: updatedHive };
      });
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      toast({
        title: 'Avilio informacija atnaujinta',
        description: 'Pakeitimai sėkmingai išsaugoti.',
      });
    },
    onError: (error) => {
      const description = error instanceof HttpError ? error.message : error instanceof Error ? error.message : undefined;
      toast({
        title: 'Nepavyko atnaujinti avilio',
        description,
        variant: 'destructive',
      });
    },
  });

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hive || updateHiveMutation.isPending) return;

    const payload: UpdateHivePayload = {
      label: editForm.label.trim(),
      location: editForm.location.trim() || undefined,
      tagId: editForm.tagId ?? null,
    };

    if (!payload.label) {
      toast({
        title: 'Trūksta pavadinimo',
        description: 'Įveskite avilio pavadinimą prieš išsaugant.',
        variant: 'destructive',
      });
      return;
    }

    if (canManageMembers) {
      payload.members = editForm.members;
    }

    updateHiveMutation.mutate(payload);
  };

  const getStatusBadge = (status: AssignmentStatus, dueDate: string) => {
    const uiStatus = resolveAssignmentUiStatus(status, dueDate);
    const variants: Record<string, { variant: 'default' | 'destructive' | 'success' | 'secondary'; label: string }> = {
      not_started: { variant: 'secondary', label: 'Nepradėta' },
      in_progress: { variant: 'default', label: 'Vykdoma' },
      done: { variant: 'success', label: 'Atlikta' },
      overdue: { variant: 'destructive', label: 'Vėluojama' },
    };

    const config = uiStatus === 'overdue' ? variants.overdue : variants[status] ?? { variant: 'secondary', label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center text-muted-foreground">Kraunama...</CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isError || !hive) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center">
            <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Avilys nerastas</h3>
            <p className="text-muted-foreground mb-6">Avilys su šiuo ID neegzistuoja</p>
            <Button asChild>
              <Link to="/hives">Grįžti į avilius</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{hive.label}</h1>
              <Badge variant={hive.status === 'active' ? 'success' : 'secondary'}>
                {hive.status === 'active'
                  ? 'Aktyvus'
                  : hive.status === 'paused'
                    ? 'Pristabdyta'
                    : 'Archyvuota'}
              </Badge>
            </div>
            {showFriendlyId && friendlyId ? (
              <p className="text-sm font-mono text-muted-foreground">{friendlyId}</p>
            ) : null}
            <div className="flex items-center gap-4 text-muted-foreground">
              {hive.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {hive.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Sukurta: {formatDate(hive.createdAt ?? new Date().toISOString())}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button asChild>
              <a
                href="https://www.busmedaus.lt/product-page/pradedan%C4%8Diojo-rinkinio-rezervacija"
                target="_blank"
                rel="noopener noreferrer"
              >
                + įsigyti papildomą rinkinį
              </a>
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('settings')}>
              <Edit className="mr-2 w-4 h-4" />
              Redaguoti
            </Button>
            <Button variant="outline">
              <Archive className="mr-2 w-4 h-4" />
              Archyvuoti
            </Button>
          </div>
        </div>

        {/* Details Card */}
        <Card className="shadow-custom">
          <CardHeader>
            <CardTitle>Informacija</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pavadinimas</p>
                <p className="font-medium">{hive.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lokacija</p>
                <p className="font-medium">{hive.location ?? 'Nenurodyta'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Žyma</p>
                <p className="font-medium">{hive.tag?.name ?? 'Nenurodyta'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sukurta</p>
                <p className="font-medium">{formatMonthYear(hive.createdAt ?? null)}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground mb-1">Priskirti vartotojai</p>
                {hive.members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hive.members.map((member) => (
                      <Badge key={member.id} variant="secondary">
                        {member.name || member.email}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nėra priskirtų vartotojų</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Užduotys</TabsTrigger>
            <TabsTrigger value="history">Istorija</TabsTrigger>
            <TabsTrigger value="settings">Nustatymai</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Užduotys</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Šiam aviliui nėra priskirtų užduočių
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assignments.map(({ assignment, task, completion }) => (
                      <div key={assignment.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{task?.title ?? 'Nežinoma užduotis'}</h4>
                              {getStatusBadge(assignment.status, assignment.dueDate)}
                            </div>
                            {task?.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Terminas: {formatDate(assignment.dueDate)}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progresas</span>
                                <span className="font-medium">{completion}%</span>
                              </div>
                              <Progress value={completion} className="h-2" />
                            </div>
                          </div>
                          <Button asChild size="sm">
                            <Link to={`/tasks/${assignment.id}/run`}>
                              Vykdyti
                              <ChevronRight className="ml-2 w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Istorija</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {historyLoading && !historyData ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kraunama istorija...
                  </div>
                ) : historyError ? (
                  <div className="text-center py-8 text-destructive">
                    Nepavyko įkelti istorijos. Pabandykite dar kartą.
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Istorija dar tuščia.</div>
                ) : (
                  <>
                    <ul className="divide-y divide-border">
                      {historyItems.map((event) => {
                        const descriptor = describeHistoryEvent(event);
                        const actorLabel = getHistoryActorLabel(event);
                        return (
                          <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary">{getHistoryEventLabel(event.type)}</Badge>
                                  <p className="font-semibold">{descriptor.title}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{descriptor.description}</p>
                                {descriptor.link ? (
                                  <Button variant="link" className="px-0" asChild>
                                    <Link to={descriptor.link}>{descriptor.linkLabel ?? 'Peržiūrėti'}</Link>
                                  </Button>
                                ) : null}
                              </div>
                              <div className="text-sm text-muted-foreground text-left sm:text-right">
                                <p className="font-medium text-foreground">{actorLabel}</p>
                                <p>{formatHistoryTimestamp(event.createdAt)}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                      <span>
                        Puslapis {currentHistoryPage} iš {historyTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentHistoryPage <= 1 || historyFetching}
                          onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        >
                          Ankstesnis
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentHistoryPage >= historyTotalPages || historyFetching}
                          onClick={() => setHistoryPage((prev) => prev + 1)}
                        >
                          Kitas
                        </Button>
                      </div>
                    </div>
                    {historyFetching && historyData ? (
                      <p className="text-xs text-muted-foreground">Atnaujinama...</p>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Avilio nustatymai</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-hive-label">Pavadinimas</Label>
                      <Input
                        id="edit-hive-label"
                        value={editForm.label}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, label: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-hive-location">Lokacija</Label>
                      <Input
                        id="edit-hive-location"
                        value={editForm.location}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                        placeholder="Pvz., Vilnius, Žvėrynas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Žyma</Label>
                      <TagSelect
                        tags={tags}
                        value={editForm.tagId}
                        onChange={(tagId) => setEditForm((prev) => ({ ...prev, tagId }))}
                        placeholder={tagsLoading ? "Kraunama..." : "Pasirinkite žymą"}
                        disabled={tagsLoading || updateHiveMutation.isPending}
                        allowCreate
                        onCreateTag={(name) => createTagMutation.mutate(name)}
                        creatingTag={createTagMutation.isPending}
                      />
                    </div>
                    {canManageMembers ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Priskirti vartotojus</Label>
                        <UserMultiSelect
                          options={memberOptions}
                          value={editForm.members}
                          onChange={(members) => setEditForm((prev) => ({ ...prev, members }))}
                          placeholder="Pasirinkite komandos narius"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetEditForm}
                      disabled={updateHiveMutation.isPending}
                    >
                      Atkurti reikšmes
                    </Button>
                    <Button type="submit" disabled={updateHiveMutation.isPending}>
                      {updateHiveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Išsaugoma...
                        </>
                      ) : (
                        'Išsaugoti'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

type HistoryEventDescriptor = {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
};

const HISTORY_FIELD_LABELS: Record<string, string> = {
  label: 'Pavadinimas',
  location: 'Lokacija',
  tag: 'Žyma',
};

const HISTORY_EVENT_LABELS: Record<HiveHistoryEventResponse['type'], string> = {
  HIVE_UPDATED: 'Avilio pakeitimai',
  TASK_ASSIGNED: 'Priskirta užduotis',
  TASK_DATES_CHANGED: 'Atnaujinti terminai',
  TASK_COMPLETED: 'Užduotis užbaigta',
};

const historyDateFormatter = new Intl.DateTimeFormat('lt-LT', { dateStyle: 'medium' });
const historyDateTimeFormatter = new Intl.DateTimeFormat('lt-LT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const parseDateValue = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
};

const formatHistoryTimestamp = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return historyDateTimeFormatter.format(parsed);
};

const formatHistoryDateValue = (value: unknown) => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'nenurodyta';
  }

  return historyDateFormatter.format(parsed);
};

const toPrintableValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }

  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : '—';
};

const getHistoryEventLabel = (type: HiveHistoryEventResponse['type']) =>
  HISTORY_EVENT_LABELS[type] ?? 'Įvykis';

const getHistoryActorLabel = (event: HiveHistoryEventResponse) => {
  const name = typeof event.user?.name === 'string' ? event.user.name.trim() : '';
  if (name) {
    return name;
  }

  const email = typeof event.user?.email === 'string' ? event.user.email.trim() : '';
  if (email) {
    return email;
  }

  return 'Sistema';
};

const buildAssignmentLink = (assignmentId?: unknown) => {
  if (typeof assignmentId !== 'string' || !assignmentId) {
    return undefined;
  }

  return `/tasks/${assignmentId}/run`;
};

const describeHistoryEvent = (event: HiveHistoryEventResponse): HistoryEventDescriptor => {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.type) {
    case 'HIVE_UPDATED': {
      const changedFields = (payload.changedFields ?? {}) as Record<
        string,
        { before?: unknown; after?: unknown }
      >;

      const changeLines = Object.entries(changedFields).map(([fieldKey, values]) => {
        const label = HISTORY_FIELD_LABELS[fieldKey] ?? fieldKey;
        const before = toPrintableValue(values?.before ?? null);
        const after = toPrintableValue(values?.after ?? null);
        return `${label}: „${before}“ → „${after}“`;
      });

      return {
        title: 'Atnaujinta avilio informacija',
        description: changeLines.length
          ? changeLines.join(' · ')
          : 'Įrašyta nauja informacija apie avilį.',
      };
    }
    case 'TASK_ASSIGNED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const startLabel = formatHistoryDateValue(payload.startDate);
      const dueLabel = formatHistoryDateValue(payload.dueDate);
      const link = buildAssignmentLink(payload.assignmentId);
      return {
        title: `Priskirta užduotis „${taskTitle}“`,
        description: `Pradžia: ${startLabel} · Pabaiga: ${dueLabel}`,
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    case 'TASK_DATES_CHANGED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const link = buildAssignmentLink(payload.assignmentId);
      const dateChanges: string[] = [];

      if ('previousStartDate' in payload || 'nextStartDate' in payload) {
        dateChanges.push(
          `Pradžia: ${formatHistoryDateValue(payload.previousStartDate)} → ${formatHistoryDateValue(
            payload.nextStartDate,
          )}`,
        );
      }

      if ('previousDueDate' in payload || 'nextDueDate' in payload) {
        dateChanges.push(
          `Pabaiga: ${formatHistoryDateValue(payload.previousDueDate)} → ${formatHistoryDateValue(
            payload.nextDueDate,
          )}`,
        );
      }

      return {
        title: `Atnaujinti terminai „${taskTitle}“`,
        description: dateChanges.length ? dateChanges.join(' · ') : 'Atnaujintas grafikas.',
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    case 'TASK_COMPLETED': {
      const taskTitle = typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Užduotis';
      const link = buildAssignmentLink(payload.assignmentId);
      return {
        title: `Užbaigta užduotis „${taskTitle}“`,
        description: 'Visi šios užduoties veiksmai atlikti 100 %.',
        link,
        linkLabel: link ? 'Peržiūrėti užduotį' : undefined,
      };
    }
    default:
      return {
        title: 'Įrašas istorijoje',
        description: 'Užfiksuotas avilio įvykis.',
      };
  }
};
