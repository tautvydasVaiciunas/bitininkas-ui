import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Search } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapTemplateFromApi,
  mapTaskFromApi,
  type CreateTaskPayload,
  type Task,
  type Template,
  type UpdateTaskPayload,
} from '@/lib/types';
import { TaskDetailsForm, type TaskDetailsFormValues, type TaskDetailsFormStep } from '@/components/tasks/TaskDetailsForm';

const messages = ltMessages.tasks;

const adminTasksQueryKey = ['tasks', 'admin', 'overview'] as const;
type TaskStatusFilter = 'active' | 'archived' | 'past';
const statusOptions: { value: TaskStatusFilter; label: string }[] = [
  { value: 'active', label: 'Aktyvios' },
  { value: 'archived', label: 'Archyvuotos' },
  { value: 'past', label: 'Praėjusios' },
];
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

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('active');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(buildDefaultTaskFormValues);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

  const { data: tasks = [], isLoading, isError } = useQuery<Task[]>({
    queryKey: [...adminTasksQueryKey, statusFilter],
    queryFn: async () => {
      const response = await api.tasks.list({ status: statusFilter });
      return response.map(mapTaskFromApi);
    },
  });

  const { data: templateList = [], isLoading: isTemplatesLoading } = useQuery<Template[]>({
    queryKey: ['templates', 'admin', 'all'],
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const templateOptions = useMemo(
    () => templateList.map((template) => ({ id: template.id, label: template.name })),
    [templateList],
  );

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description?.toLowerCase().includes(normalizedQuery) ?? false);
      return matchesSearch;
    });
  }, [tasks, searchQuery]);

  const resetEditForm = () => {
    setEditForm(buildDefaultTaskFormValues());
    setEditingTaskId(null);
    editingTaskIdRef.current = null;
    setEditingTask(null);
    setSelectedTemplateId('');
    setIsLoadingEditData(false);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    resetEditForm();
  };

  const invalidateQueries = (currentStatus: TaskStatusFilter = statusFilter) => {
    void queryClient.invalidateQueries({ queryKey: [...adminTasksQueryKey, currentStatus] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const buildTaskPayload = (
    values: TaskFormState,
    templateId?: string,
  ): UpdateTaskPayload | null => {
    const trimmedTitle = values.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationTitle);
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

    const payload: UpdateTaskPayload = {
      title: trimmedTitle,
      description: values.description.trim() || undefined,
      steps: sanitizedSteps.map((step, index) => ({
        title: step.title,
        contentText: step.contentText || undefined,
        orderIndex: index + 1,
      })),
    };

    if (templateId) {
      payload.templateId = templateId;
    }

    return payload;
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingTaskId) {
      return;
    }

    const normalizedTemplateId = selectedTemplateId.trim();
    const payload = buildTaskPayload(editForm, normalizedTemplateId || undefined);
    if (!payload) {
      return;
    }

    updateMutation.mutate({ id: editingTaskId, payload });
  };

  const handleOpenEditDialog = (task: Task) => {
    const taskId = task.id;
    setEditingTaskId(taskId);
    editingTaskIdRef.current = taskId;
    setEditingTask(task);
    setIsEditDialogOpen(true);
    setIsLoadingEditData(true);
    setEditForm(mapTaskToFormValues(task));
    setSelectedTemplateId('');

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const response = await api.tasks.update(id, payload);
      return mapTaskFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      setIsEditDialogOpen(false);
      resetEditForm();
      invalidateQueries(statusFilter);
    },
    onError: (error: unknown) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.updateError);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.tasks.archive(taskId, true);
    },
    onSuccess: () => {
      toast.success('Užduotis archyvuota');
      invalidateQueries(statusFilter);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof HttpError ? error.message : 'Nepavyko archyvuoti užduoties';
      toast.error(message);
    },
  });

  const editFormDisabled =
    !editingTaskId || updateMutation.isPending || isLoadingEditData;

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
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatusFilter)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Būsena" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => archiveMutation.mutate(task.id)}
                          disabled={archiveMutation.isLoading || statusFilter === 'archived'}
                        >
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

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="sm:max-w-3xl w-full">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Redaguoti užduotį</DialogTitle>
              <DialogDescription>
                Keiskite pavadinimą, aprašymą ir žingsnius. Senosios kategorijų/dažnio parinktys nerodomos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-template-select">Šablonas</Label>
                <Select
                  id="task-template-select"
                  value={selectedTemplateId}
                  onValueChange={(next) => setSelectedTemplateId(next)}
                  disabled={isTemplatesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Palikite tuščią, jei šablonas nekinta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Palikti dabartinius žingsnius</SelectItem>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Pasirinkus šabloną žingsniai bus atnaujinti ir nebaigtų užduočių progresas išvalomas.
                </p>
              </div>
              {editingTask ? (
                <div className="rounded-md border border-muted p-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold">Šablonas:</span>{' '}
                    {editingTask.category ?? 'Informacija neprieinama'}
                  </p>
                  <p>
                    <span className="font-semibold">Sukurta:</span>{' '}
                    {new Date(editingTask.createdAt).toLocaleDateString('lt-LT')}
                  </p>
                </div>
              ) : null}
            </div>


            <TaskDetailsForm
              className="flex-1"
              values={editForm}
              onChange={(updater) => setEditForm(updater)}
              disabled={editFormDisabled || isLoadingEditData}
              showScheduling={false}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeEditDialog} disabled={updateMutation.isPending}>
                Atšaukti
              </Button>
              <Button type="submit" disabled={editFormDisabled}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Išsaugoti
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
