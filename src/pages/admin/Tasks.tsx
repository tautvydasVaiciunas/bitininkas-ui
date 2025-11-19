import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
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
import { Label } from '@/components/ui/label';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import { mapTemplateFromApi, mapTaskFromApi, type Task, type Template, type UpdateTaskPayload } from '@/lib/types';

const messages = ltMessages.tasks;

const adminTasksQueryKey = ['tasks', 'admin', 'overview'] as const;
type TaskStatusFilter = 'active' | 'archived' | 'past' | 'all';
const statusOptions: { value: TaskStatusFilter; label: string }[] = [
  { value: 'active', label: 'Aktyvios' },
  { value: 'archived', label: 'Archyvuotos' },
  { value: 'past', label: 'Praėjusios' },
  { value: 'all', label: 'Visos' },
];
const buildDefaultTaskTitle = () => '';

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('active');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const [editTitle, setEditTitle] = useState(buildDefaultTaskTitle());

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
      const matchesSearch = !normalizedQuery || task.title.toLowerCase().includes(normalizedQuery);
      return matchesSearch;
    });
  }, [searchQuery, tasks]);

  const resetEditForm = () => {
    setEditTitle(buildDefaultTaskTitle());
    setEditingTaskId(null);
    editingTaskIdRef.current = null;
    setEditingTask(null);
    setSelectedTemplateId(undefined);
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

  const buildTaskPayload = (templateId?: string): UpdateTaskPayload | null => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationTitle);
      return null;
    }

    const payload: UpdateTaskPayload = {
      title: trimmedTitle,
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

    const normalizedTemplateId = selectedTemplateId?.trim() ?? '';
    const payload = buildTaskPayload(normalizedTemplateId || undefined);
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
    setEditTitle(task.title);
    setSelectedTemplateId(task.templateId ?? undefined);
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const response = await api.tasks.update(id, payload);
      return mapTaskFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      closeEditDialog();
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

  const editFormDisabled = !editingTaskId || updateMutation.isPending;

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
            <CardContent className="p-12 text-center text-destructive">
              Nepavyko įkelti užduočių.
            </CardContent>
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
              const latestNews = task.latestNews;
              const groupNames = latestNews?.groups?.map((group) => group.name).filter(Boolean) ?? [];
              const formatShortDate = (value?: string | null) =>
                value ? new Date(value).toLocaleDateString('lt-LT') : null;

              return (
                <Card key={task.id} className="shadow-custom hover:shadow-custom-md transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">{`Šablonas: ${
                        task.templateName ?? 'nepriskirtas'
                      }`}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.updatedAt && task.updatedAt !== task.createdAt
                          ? `Atnaujinta: ${new Date(task.updatedAt).toLocaleDateString('lt-LT')}`
                          : task.createdAt
                          ? `Sukurta: ${new Date(task.createdAt).toLocaleDateString('lt-LT')}`
                          : 'Data: neaiški'}
                      </p>
                      {groupNames.length ? (
                        <p className="text-sm text-muted-foreground">
                          Grupės: {groupNames.join(', ')}
                        </p>
                      ) : null}
                      {latestNews?.assignmentStartDate ? (
                        <p className="text-sm text-muted-foreground">
                          Pradžios data: {formatShortDate(latestNews.assignmentStartDate)}
                        </p>
                      ) : null}
                      {latestNews?.assignmentDueDate ? (
                        <p className="text-sm text-muted-foreground">
                          Pabaigos data: {formatShortDate(latestNews.assignmentDueDate)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="w-full max-h-[90vh] sm:max-w-2xl flex flex-col">
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 gap-4">
            <DialogHeader>
              <DialogTitle>Redaguoti užduotį</DialogTitle>
              <DialogDescription>
                Pakeiskite tik pavadinimą ir, jei reikia, susietą šabloną. Žingsnių redagavimas
                atliekamas šablonų lygyje.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {editingTask ? (
                <div className="rounded-md border border-muted p-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold">
                      {editingTask.updatedAt && editingTask.updatedAt !== editingTask.createdAt
                        ? 'Atnaujinta:'
                        : 'Sukurta:'}
                    </span>{' '}
                    {editingTask.updatedAt && editingTask.updatedAt !== editingTask.createdAt
                      ? new Date(editingTask.updatedAt).toLocaleDateString('lt-LT')
                      : editingTask.createdAt
                      ? new Date(editingTask.createdAt).toLocaleDateString('lt-LT')
                      : 'nežinoma'}
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Pavadinimas</Label>
                  <Input
                    id="task-title"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-template-select">Šablonas</Label>
                <Select
                  id="task-template-select"
                  value={selectedTemplateId ?? undefined}
                  onValueChange={(next) => setSelectedTemplateId(next ?? undefined)}
                  disabled={isTemplatesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Palikti dabartinį šabloną" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
            </div>

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
