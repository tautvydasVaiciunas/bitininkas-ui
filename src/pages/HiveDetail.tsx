import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import api, { HttpError, type AdminUserResponse, type HiveMemberResponse } from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapTaskFromApi,
  type Assignment,
  type AssignmentStatus,
  type Hive,
  type HiveStatus,
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

type HiveTab = 'tasks' | 'history' | 'settings';

const HiveHistoryTabLazy = lazy(() => import('./HiveHistoryTab'));

export default function HiveDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
  const isArchived = hive?.status === 'archived';

  const [activeTab, setActiveTab] = useState<HiveTab>('tasks');
  const [editForm, setEditForm] = useState<EditFormState>({
    label: '',
    location: '',
    tagId: null,
    members: [] as string[],
  });

  const canManageMembers = user?.role === 'admin' || user?.role === 'manager';
  const canManageHistory = canManageMembers;

  const handleTabChange = (value: HiveTab) => {
    if (!canManageMembers && value === 'settings') {
      return;
    }

    setActiveTab(value);
  };

  useEffect(() => {
    if (!canManageMembers && activeTab === 'settings') {
      setActiveTab('tasks');
    }
  }, [activeTab, canManageMembers]);

  const { data: users = [] } = useQuery<AdminUserResponse[]>({
    queryKey: ['users', 'all'],
    queryFn: () => api.users.list(),
    enabled: canManageMembers,
  });

  const { data: assignedMembers = [] } = useQuery<HiveMemberResponse[]>({
    queryKey: ['hive', id, 'members'],
    enabled: !!id,
    queryFn: () => (id ? api.hives.members(id) : []),
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

  const archiveHiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HiveStatus }) =>
      api.hives.update(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      queryClient.invalidateQueries({ queryKey: ['hive', variables.id] });
      toast({
        title:
          variables.status === 'archived'
            ? 'Avilys archyvuotas'
            : 'Avilys suaktyvintas',
        description:
          variables.status === 'archived'
            ? 'Avilys dabar nebeaktyvus.'
            : 'Avilys vėl pasiekiamas sąraše.',
      });
      navigate('/hives');
    },
    onError: () => {
      toast({
        title: 'Klaida',
        description: 'Nepavyko atnaujinti avilio būsenos.',
        variant: 'destructive',
      });
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

  const memberLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of memberOptions) {
      map.set(option.value, option.label ?? option.value);
    }
    return map;
  }, [memberOptions]);

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

  const assignedUsers = useMemo(() => {
    const map = new Map<string, HiveMemberResponse>();
    if (hive?.owner) {
      map.set(hive.owner.id, {
        id: hive.owner.id,
        email: hive.owner.email,
        name: hive.owner.name ?? null,
      });
    }
    for (const member of assignedMembers ?? []) {
      if (member.id) {
        map.set(member.id, member);
      }
    }
    return Array.from(map.values());
  }, [hive?.owner, assignedMembers]);

  const assignments = useMemo(() => data?.assignments ?? [], [data]);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const currentAssignments = useMemo(() => {
    const parseDate = (value?: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    return assignments.filter(({ assignment }) => {
      if (assignment.status === 'done') {
        return false;
      }

      const startDate = parseDate(assignment.startDate);
      const dueDate = parseDate(assignment.dueDate);
      const startOk = !startDate || startDate <= today;
      const activeWindow = !dueDate || dueDate >= today;
      const overdue = dueDate && dueDate < today;
      return startOk && (activeWindow || overdue);
    });
  }, [assignments, today]);

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
      queryClient.invalidateQueries({ queryKey: ['hive', id, 'members'] });
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
              {isArchived ? (
                <Badge variant="destructive" className="text-xs uppercase tracking-wider">
                  Archyvuotas
                </Badge>
              ) : null}
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
            {canManageMembers ? (
              <Button variant="outline" onClick={() => handleTabChange('settings')}>
                <Edit className="mr-2 w-4 h-4" />
                Redaguoti
              </Button>
            ) : null}
            {canManageMembers ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (!hive) return;
                  archiveHiveMutation.mutate({
                    id: hive.id,
                    status: isArchived ? 'active' : 'archived',
                  });
                }}
                disabled={archiveHiveMutation.isPending}
              >
                <Archive className="mr-2 w-4 h-4" />
                {isArchived ? 'Suaktyvinti' : 'Archyvuoti'}
              </Button>
            ) : null}
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
              {canManageMembers && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Žyma</p>
                  <p className="font-medium">{hive.tag?.name ?? 'Nenurodyta'}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sukurta</p>
                <p className="font-medium">{formatMonthYear(hive.createdAt ?? null)}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground mb-1">Priskirti vartotojai</p>
                {assignedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedUsers.map((member) => (
                      <Badge key={member.id} variant="secondary">
                        {member.name || member.email || member.id}
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => handleTabChange(value as HiveTab)}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="tasks">Užduotys</TabsTrigger>
            <TabsTrigger value="history">Istorija</TabsTrigger>
            {canManageMembers ? <TabsTrigger value="settings">Nustatymai</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="tasks">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Užduotys</CardTitle>
              </CardHeader>
              <CardContent>
                {currentAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Šiam aviliui nėra priskirtų užduočių
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {currentAssignments.map(({ assignment, task, completion }) => (
                      <div key={assignment.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{task?.title ?? 'Nežinoma užduotis'}</h4>
                              {getStatusBadge(assignment.status, assignment.dueDate)}
                            </div>
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
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Kraunama istorija...
                    </div>
                  }
                >
                  {id ? (
                    <HiveHistoryTabLazy hiveId={id} canManage={canManageHistory} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Avilio istorija nepasiekiama.
                    </div>
                  )}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
          {canManageMembers ? (
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
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {hive?.owner ? (
                          <Badge variant="outline">
                            {hive.owner.name || hive.owner.email}
                          </Badge>
                        ) : null}
                        {editForm.members.map((memberId) => (
                          <Badge key={memberId} variant="secondary">
                            {memberLabelMap.get(memberId) ?? memberId}
                          </Badge>
                        ))}
                        {editForm.members.length === 0 && !hive?.owner ? (
                          <p className="text-sm text-muted-foreground">Nėra priskirtų narių</p>
                        ) : null}
                      </div>
                      <Label>Priskirti vartotojus</Label>
                    </div>
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
          ) : null}
        </Tabs>
      </div>
    </MainLayout>
  );
}
