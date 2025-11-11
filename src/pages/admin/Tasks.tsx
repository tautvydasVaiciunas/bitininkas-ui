import { FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapTaskFromApi,
  mapTemplateFromApi,
  mapGroupFromApi,
  type CreateTaskPayload,
  type Task,
  type UpdateTaskPayload,
  type Template,
  type Group,
  type BulkAssignmentsFromTemplatePayload,
  type BulkAssignmentsFromTemplateResponse,
} from '@/lib/types';
import { TaskDetailsForm, type TaskDetailsFormValues, type TaskDetailsFormStep } from '@/components/tasks/TaskDetailsForm';
import { UserMultiSelect } from '@/components/UserMultiSelect';

const messages = ltMessages.tasks;

const adminTasksQueryKey = ['tasks', 'admin', 'overview'] as const;
const buildDefaultTaskFormValues = (): TaskDetailsFormValues => ({
  title: '',
  description: '',
  category: '',
  frequency: 'once',
  defaultDueDays: '7',
  seasonMonths: [],
  steps: [{ title: '', contentText: '' }],
});

type TaskFormState = TaskDetailsFormValues;

type EditFormStep = TaskDetailsFormStep;

type AssignmentFormState = {
  templateId: string;
  groupIds: string[];
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  notify: boolean;
};

const mapTaskToFormValues = (task: Task): TaskDetailsFormValues => ({
  title: task.title,
  description: task.description ?? '',
  category: task.category ?? '',
  frequency: task.frequency,
  defaultDueDays: String(task.defaultDueDays ?? 7),
  seasonMonths: Array.isArray(task.seasonMonths)
    ? [...task.seasonMonths].sort((a, b) => a - b)
    : [],
  steps: [{ title: '', contentText: '' }],
});

const buildDefaultAssignmentForm = (): AssignmentFormState => ({
  templateId: '',
  groupIds: [],
  title: '',
  description: '',
  startDate: '',
  dueDate: '',
  notify: true,
});

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskFormState>(buildDefaultTaskFormValues);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(buildDefaultTaskFormValues);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(buildDefaultAssignmentForm);

  const { data: tasks = [], isLoading, isError } = useQuery<Task[]>({
    queryKey: adminTasksQueryKey,
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ['templates', 'all'],
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['groups', 'all'],
    queryFn: async () => {
      const response = await api.groups.list({ limit: 1000 });
      return response.map(mapGroupFromApi);
    },
  });

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description?.toLowerCase().includes(normalizedQuery) ?? false);
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [tasks, searchQuery, categoryFilter]);

  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template.id, label: template.name })),
    [templates],
  );

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.name,
        description: group.description ?? undefined,
      })),
    [groups],
  );

  const resetCreateForm = () => {
    setCreateForm(buildDefaultTaskFormValues());
  };

  const resetEditForm = () => {
    setEditForm(buildDefaultTaskFormValues());
    setEditingTaskId(null);
    editingTaskIdRef.current = null;
    setIsLoadingEditData(false);
  };

  const resetAssignmentForm = () => {
    setAssignmentForm(buildDefaultAssignmentForm());
  };

  const invalidateQueries = () => {
    void queryClient.invalidateQueries({ queryKey: adminTasksQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const buildTaskPayload = (values: TaskFormState): CreateTaskPayload | null => {
    const trimmedTitle = values.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationTitle);
      return null;
    }

    const parsedDefaultDueDays = Number(values.defaultDueDays);
    if (!Number.isFinite(parsedDefaultDueDays) || parsedDefaultDueDays <= 0) {
      toast.error(messages.validationDefaultDueDays);
      return null;
    }

    const sanitizedSteps = values.steps
      .map((step) => ({
        title: step.title.trim(),
        contentText: step.contentText.trim(),
      }))
      .filter((step) => step.title.length > 0);

    if (sanitizedSteps.length === 0) {
      toast.error(
        'Pridėkite bent vieną žingsnį. Užduotis turi turėti bent vieną žingsnį su pavadinimu.',
      );
      return null;
    }

    const seasonMonths = [...values.seasonMonths].sort((a, b) => a - b);

    return {
      title: trimmedTitle,
      description: values.description.trim() || undefined,
      category: values.category.trim() || undefined,
      frequency: values.frequency,
      defaultDueDays: parsedDefaultDueDays,
      seasonMonths: seasonMonths.length > 0 ? seasonMonths : undefined,
      steps: sanitizedSteps.map((step) => ({
        title: step.title,
        contentText: step.contentText || undefined,
      })),
    };
  };

  const handleOpenEditDialog = (task: Task) => {
    const taskId = task.id;
    setEditingTaskId(taskId);
    editingTaskIdRef.current = taskId;
    setIsEditDialogOpen(true);
    setIsLoadingEditData(true);
    setEditForm(mapTaskToFormValues(task));

    void (async () => {
      try {
        const response = await api.tasks.getSteps(taskId);
        const sortedSteps = [...response].sort((a, b) => a.orderIndex - b.orderIndex);
        const mappedSteps: EditFormStep[] = sortedSteps.map((step) => ({
          id: step.id,
          title: step.title,
          contentText: step.contentText ?? '',
        }));

        if (editingTaskIdRef.current !== taskId) {
          return;
        }

        setEditForm((previous) => ({
          ...previous,
          steps: mappedSteps.length > 0 ? mappedSteps : [{ title: '', contentText: '' }],
        }));
      } catch (error) {
        if (editingTaskIdRef.current !== taskId) {
          return;
        }
        console.error('Failed to load task steps', error);
        toast.error('Nepavyko įkelti užduoties žingsnių.');
        setEditForm((previous) => ({
          ...previous,
          steps: previous.steps.length > 0 ? previous.steps : [{ title: '', contentText: '' }],
        }));
      } finally {
        if (editingTaskIdRef.current === taskId) {
          setIsLoadingEditData(false);
        }
      }
    })();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const response = await api.tasks.create(payload);
      return mapTaskFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.createSuccess);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      invalidateQueries();
    },
    onError: (error: unknown) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const response = await api.tasks.update(id, payload);
      return mapTaskFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      setIsEditDialogOpen(false);
      resetEditForm();
      invalidateQueries();
    },
    onError: (error: unknown) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.updateError);
    },
  });

  const bulkAssignmentMutation = useMutation<
    BulkAssignmentsFromTemplateResponse,
    HttpError | Error,
    BulkAssignmentsFromTemplatePayload
  >({
    mutationFn: (payload) => api.assignments.bulkFromTemplate(payload),
    onSuccess: (result) => {
      toast.success(
        `Priskirta ${result.created} užduočių ${result.groups ?? 0} grupėms.`,
      );
      resetAssignmentForm();
      setIsAssignmentDialogOpen(false);
      invalidateQueries();
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error('Nepavyko priskirti šablono');
    },
  });

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createMutation.isPending) {
      return;
    }

    const payload = buildTaskPayload(createForm);
    if (!payload) {
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingTaskId || updateMutation.isPending) {
      return;
    }

    const payload = buildTaskPayload(editForm) as UpdateTaskPayload | null;
    if (!payload) {
      return;
    }

    await updateMutation.mutateAsync({ id: editingTaskId, payload });
  };

  const editFormDisabled = updateMutation.isPending || isLoadingEditData;

  const handleAssignmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (bulkAssignmentMutation.isPending) {
      return;
    }

    if (!assignmentForm.templateId) {
      toast.error('Pasirinkite šabloną');
      return;
    }

    if (!assignmentForm.groupIds.length) {
      toast.error('Pasirinkite bent vieną grupę');
      return;
    }

    const trimmedTitle = assignmentForm.title.trim();
    if (!trimmedTitle) {
      toast.error('Pavadinimas privalomas');
      return;
    }

    if (!assignmentForm.startDate) {
      toast.error('Nurodykite pradžios datą');
      return;
    }

    if (!assignmentForm.dueDate) {
      toast.error('Nurodykite pabaigos datą');
      return;
    }

    if (assignmentForm.startDate > assignmentForm.dueDate) {
      toast.error('Pabaigos data negali būti ankstesnė už pradžią');
      return;
    }

    const payload: BulkAssignmentsFromTemplatePayload = {
      templateId: assignmentForm.templateId,
      groupIds: assignmentForm.groupIds,
      title: trimmedTitle,
      description: assignmentForm.description.trim() || undefined,
      startDate: assignmentForm.startDate,
      dueDate: assignmentForm.dueDate,
      notify: assignmentForm.notify,
    };

    bulkAssignmentMutation.mutate(payload);
  };

  const getFrequencyLabel = (frequency: Task['frequency']) => {
    const labels: Record<Task['frequency'], string> = {
      once: 'Vienkartinė',
      weekly: 'Kas savaitę',
      monthly: 'Kas mėnesį',
      seasonal: 'Sezoninė',
    };
    return labels[frequency];
  };

  const formatSeason = (months: number[]) => {
    if (!months.length) return null;
    const formatter = new Intl.DateTimeFormat('lt-LT', { month: 'short' });
    return months
      .map((month) => {
        const date = new Date();
        date.setUTCMonth(month - 1);
        return formatter.format(date);
      })
      .join(', ');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetEditForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redaguoti užduotį</DialogTitle>
              <DialogDescription>Atnaujinkite užduoties informaciją.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {isLoadingEditData && (
                <p className="text-sm text-muted-foreground">Įkeliami užduoties žingsniai...</p>
              )}
              <TaskDetailsForm
                values={editForm}
                onChange={(updater) => setEditForm((prev) => updater(prev))}
                disabled={editFormDisabled}
              />

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetEditForm();
                  }}
                  disabled={updateMutation.isPending}
                >
                  Atšaukti
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || isLoadingEditData}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saugoma...
                    </>
                  ) : isLoadingEditData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kraunama...
                    </>
                  ) : (
                    'Išsaugoti'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Užduotys</h1>
            <p className="text-muted-foreground mt-1">
              Kurkite ir redaguokite bitininkams skirtas užduotis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Dialog
              open={isAssignmentDialogOpen}
              onOpenChange={(open) => {
                setIsAssignmentDialogOpen(open);
                if (!open) {
                  resetAssignmentForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" disabled={bulkAssignmentMutation.isPending}>
                  {bulkAssignmentMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 w-4 h-4" />
                  )}
                  {bulkAssignmentMutation.isPending ? 'Priskiriama...' : 'Priskirti šabloną'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Priskirti šabloną grupėms</DialogTitle>
                  <DialogDescription>
                    Pasirinkite šabloną, grupes ir datas. Visiems priskirtiems nariams bus išsiųsti
                    pranešimai.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment-template">Šablonas</Label>
                    <Select
                      value={assignmentForm.templateId}
                      onValueChange={(value) =>
                        setAssignmentForm((prev) => ({ ...prev, templateId: value }))
                      }
                      disabled={templatesLoading || bulkAssignmentMutation.isPending}
                    >
                      <SelectTrigger id="assignment-template">
                        <SelectValue
                          placeholder={templatesLoading ? 'Kraunama...' : 'Pasirinkite šabloną'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {templateOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Grupės</Label>
                    <UserMultiSelect
                      options={groupOptions}
                      value={assignmentForm.groupIds}
                      onChange={(next) => setAssignmentForm((prev) => ({ ...prev, groupIds: next }))}
                      placeholder={
                        groupsLoading ? 'Kraunama...' : 'Pasirinkite grupes, kurioms skirta užduotis'
                      }
                      disabled={groupsLoading || bulkAssignmentMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignment-title">Pavadinimas</Label>
                    <Input
                      id="assignment-title"
                      value={assignmentForm.title}
                      onChange={(event) =>
                        setAssignmentForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Pvz., Pavasarinė apžiūra"
                      disabled={bulkAssignmentMutation.isPending}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignment-description">Aprašymas</Label>
                    <Textarea
                      id="assignment-description"
                      value={assignmentForm.description}
                      onChange={(event) =>
                        setAssignmentForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Papildoma informacija gavėjams"
                      rows={3}
                      disabled={bulkAssignmentMutation.isPending}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="assignment-start-date">Pradžios data</Label>
                      <Input
                        id="assignment-start-date"
                        type="date"
                        value={assignmentForm.startDate}
                        onChange={(event) =>
                          setAssignmentForm((prev) => ({ ...prev, startDate: event.target.value }))
                        }
                        disabled={bulkAssignmentMutation.isPending}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignment-due-date">Pabaigos data</Label>
                      <Input
                        id="assignment-due-date"
                        type="date"
                        value={assignmentForm.dueDate}
                        onChange={(event) =>
                          setAssignmentForm((prev) => ({ ...prev, dueDate: event.target.value }))
                        }
                        disabled={bulkAssignmentMutation.isPending}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="assignment-notify"
                      checked={assignmentForm.notify}
                      onCheckedChange={(checked) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          notify: Boolean(checked),
                        }))
                      }
                      disabled={bulkAssignmentMutation.isPending}
                    />
                    <Label htmlFor="assignment-notify" className="text-sm text-muted-foreground">
                      Išsiųsti pranešimus ir el. laiškus gavėjams
                    </Label>
                  </div>

                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetAssignmentForm();
                        setIsAssignmentDialogOpen(false);
                      }}
                      disabled={bulkAssignmentMutation.isPending}
                    >
                      Atšaukti
                    </Button>
                    <Button type="submit" disabled={bulkAssignmentMutation.isPending}>
                      {bulkAssignmentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Priskiriama...
                        </>
                      ) : (
                        'Priskirti'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  resetCreateForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 w-4 h-4" />
                  )}
                  {createMutation.isPending ? 'Saugoma...' : 'Sukurti užduotį'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nauja užduotis</DialogTitle>
                  <DialogDescription>
                    Nurodykite užduoties informaciją ir jos žingsnius.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-6">
                  <TaskDetailsForm
                    values={createForm}
                    onChange={(updater) => setCreateForm((prev) => updater(prev))}
                    disabled={createMutation.isPending}
                  />

                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetCreateForm();
                        setIsCreateDialogOpen(false);
                      }}
                      disabled={createMutation.isPending}
                    >
                      Atšaukti
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saugoma...
                        </>
                      ) : (
                        'Sukurti'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-custom">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ieškoti užduočių..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Kategorija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visos kategorijos</SelectItem>
                  {[...new Set(tasks.map((task) => task.category).filter(Boolean))].map((category) => (
                    <SelectItem key={category as string} value={category as string}>
                      {category as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-muted-foreground">Kraunama...</CardContent>
          </Card>
        ) : isError ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-destructive">Nepavyko įkelti užduočių.</CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Nerasta užduočių</h3>
              <p className="text-muted-foreground">Pabandykite pakeisti paieškos kriterijus</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const seasonLabel = formatSeason(task.seasonMonths);

              return (
                <Card key={task.id} className="shadow-custom hover:shadow-custom-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                          {task.category && <Badge variant="secondary">{task.category}</Badge>}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Dažnis:</span>{' '}
                            <span className="font-medium">{getFrequencyLabel(task.frequency)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Numatytas terminas:</span>{' '}
                            <span className="font-medium">{task.defaultDueDays} d.</span>
                          </div>
                        </div>

                        {seasonLabel && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sezonas:</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {seasonLabel}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(task)}
                          disabled={updateMutation.isPending}
                        >
                          <Edit className="mr-2 w-4 h-4" />
                          Redaguoti
                        </Button>
                        <Button variant="outline" size="sm">
                          <Archive className="mr-2 w-4 h-4" />
                          Archyvuoti
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
