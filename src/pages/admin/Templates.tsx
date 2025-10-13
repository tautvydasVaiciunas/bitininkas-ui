import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapTaskFromApi,
  mapTaskStepFromApi,
  mapTemplateFromApi,
  type CreateTemplatePayload,
  type ReorderTemplateStepsPayload,
  type Task,
  type TaskStep,
  type Template,
  type TemplateStepInputPayload,
  type UpdateTemplatePayload,
} from '@/lib/types';

const messages = ltMessages.templates;

interface TemplateStepDraft {
  id?: string;
  taskStepId: string;
  taskStep: TaskStep;
}

interface TemplateFormValues {
  name: string;
  comment: string;
  steps: TemplateStepDraft[];
}

export default function AdminTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const queryClient = useQueryClient();

  const templatesQueryKey = ['templates'] as const;

  const invalidateTemplates = () => {
    void queryClient.invalidateQueries({ queryKey: templatesQueryKey });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTemplateToEdit(null);
  };

  const showError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      toast.error(error.message);
      return;
    }
    toast.error(fallback);
  };

  const { data: templates = [], isLoading, isError } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'for-templates'],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const taskTitleById = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      map.set(task.id, task.title);
    });
    return map;
  }, [tasks]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      api.templates.create(payload).then(mapTemplateFromApi),
    onSuccess: (createdTemplate) => {
      toast.success(messages.createSuccess);
      closeDialog();
      queryClient.setQueryData<Template[]>(templatesQueryKey, (current = []) => {
        const withoutDuplicate = current.filter((item) => item.id !== createdTemplate.id);
        return [...withoutDuplicate, createdTemplate].sort((a, b) => a.name.localeCompare(b.name));
      });
      invalidateTemplates();
    },
    onError: (error) => {
      showError(error, messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      api.templates.update(id, payload).then(mapTemplateFromApi),
    onSuccess: (updatedTemplate) => {
      toast.success(messages.updateSuccess);
      closeDialog();
      queryClient.setQueryData<Template[]>(templatesQueryKey, (current = []) => {
        const updated = current.map((item) => (item.id === updatedTemplate.id ? updatedTemplate : item));
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
      invalidateTemplates();
    },
    onError: (error) => {
      showError(error, messages.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.templates.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      toast.success(messages.deleteSuccess);
      queryClient.setQueryData<Template[]>(templatesQueryKey, (current = []) =>
        current.filter((template) => template.id !== deletedId),
      );
      invalidateTemplates();
    },
    onError: (error) => {
      showError(error, messages.deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, steps }: { id: string; steps: ReorderTemplateStepsPayload['steps'] }) =>
      api.templates.reorderSteps(id, { steps }).then(mapTemplateFromApi),
    onSuccess: (updatedTemplate) => {
      toast.success(messages.reorderSuccess);
      queryClient.setQueryData<Template[]>(templatesQueryKey, (current = []) => {
        const updated = current.map((item) => (item.id === updatedTemplate.id ? updatedTemplate : item));
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
      invalidateTemplates();
    },
    onError: (error) => {
      showError(error, messages.reorderError);
    },
  });

  const filteredTemplates = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return templates;
    return templates.filter((template) => {
      const nameMatches = template.name.toLowerCase().includes(normalized);
      const stepMatches = template.steps.some((step) =>
        step.taskStep.title.toLowerCase().includes(normalized),
      );
      return nameMatches || stepMatches;
    });
  }, [templates, searchQuery]);

  const handleOpenCreate = () => {
    setTemplateToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setTemplateToEdit(template);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (values: TemplateFormValues) => {
    const name = values.name.trim();
    if (!name) {
      toast.error(messages.noName);
      return;
    }

    const commentText = values.comment.trim();
    const comment = commentText.length > 0 ? commentText : null;

    const steps: TemplateStepInputPayload[] = values.steps.map((step, index) => ({
      taskStepId: step.taskStepId,
      orderIndex: index + 1,
    }));

    if (templateToEdit) {
      await updateMutation.mutateAsync({
        id: templateToEdit.id,
        payload: { name, comment, steps: steps.length ? steps : undefined },
      });
    } else {
      await createMutation.mutateAsync({
        name,
        comment: comment ?? undefined,
        steps: steps.length ? steps : undefined,
      });
    }
  };

  const handleReorder = (template: Template, stepId: string, direction: 'up' | 'down') => {
    if (reorderMutation.isLoading) {
      return;
    }

    const ordered = [...template.steps].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = ordered.findIndex((step) => step.id === stepId);
    if (index === -1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) {
      return;
    }

    const updated = [...ordered];
    const [moved] = updated.splice(index, 1);
    updated.splice(swapIndex, 0, moved);

    const steps = updated.map((step, idx) => ({ id: step.id, orderIndex: idx + 1 }));
    reorderMutation.mutate({ id: template.id, steps });
  };

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Šablonai</h1>
            <p className="text-muted-foreground mt-1">Kurkite ir tvarkykite šablonus su žingsniais</p>
          </div>
          <Button onClick={handleOpenCreate} disabled={isSubmitting}>
            {createMutation.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 w-4 h-4" />
            )}
            {createMutation.isLoading ? 'Kuriama...' : 'Sukurti šabloną'}
          </Button>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setTemplateToEdit(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{templateToEdit ? 'Redaguoti šabloną' : 'Naujas šablonas'}</DialogTitle>
              <DialogDescription>
                {templateToEdit
                  ? 'Atnaujinkite šablono informaciją.'
                  : 'Pasirinkite žingsnius ir sukurkite naują šabloną.'}
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              tasks={tasks}
              template={templateToEdit}
              onCancel={closeDialog}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti šablonų..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Kraunama...</div>
            ) : isError ? (
              <div className="py-12 text-center text-destructive">Nepavyko įkelti šablonų.</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nerasta šablonų</div>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => deleteMutation.mutate(template.id)}
                    onReorder={(stepId, direction) => handleReorder(template, stepId, direction)}
                    disableActions={deleteMutation.isLoading || reorderMutation.isLoading}
                    taskTitleById={taskTitleById}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface TemplateFormProps {
  tasks: Task[];
  template: Template | null;
  onCancel: () => void;
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  isSubmitting: boolean;
}

function TemplateForm({ tasks, template, onCancel, onSubmit, isSubmitting }: TemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [comment, setComment] = useState(template?.comment ?? '');
  const [templateSteps, setTemplateSteps] = useState<TemplateStepDraft[]>(
    template?.steps.map((step) => ({
      id: step.id,
      taskStepId: step.taskStepId,
      taskStep: step.taskStep,
    })) ?? [],
  );

  useEffect(() => {
    setName(template?.name ?? '');
    setComment(template?.comment ?? '');
    setTemplateSteps(
      template?.steps.map((step) => ({
        id: step.id,
        taskStepId: step.taskStepId,
        taskStep: step.taskStep,
      })) ?? [],
    );
  }, [template]);

  const availableTasks = useMemo(
    () => [...tasks].sort((a, b) => a.title.localeCompare(b.title)),
    [tasks],
  );

  const { data: availableSteps = [] } = useQuery<TaskStep[]>({
    queryKey: ['tasks', selectedTaskId, 'steps', 'for-template'],
    queryFn: () => api.tasks.getSteps(selectedTaskId!).then((response) => response.map(mapTaskStepFromApi)),
    enabled: !!selectedTaskId,
  });

  const handleAddStep = (step: TaskStep) => {
    const exists = templateSteps.some((item) => item.taskStepId === step.id);
    if (exists) {
      toast.error(messages.stepExists);
      return;
    }

    setTemplateSteps((prev) => [...prev, { taskStepId: step.id, taskStep: step }]);
    toast.success(messages.stepAdded);
  };

  const handleRemoveStep = (stepId: string) => {
    setTemplateSteps((prev) => prev.filter((step) => step.taskStepId !== stepId));
  };

  const handleReorder = (stepId: string, direction: 'up' | 'down') => {
    const index = templateSteps.findIndex((step) => step.taskStepId === stepId);
    if (index === -1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= templateSteps.length) {
      return;
    }

    setTemplateSteps((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(swapIndex, 0, moved);
      return updated;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name, comment, steps: templateSteps });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Pavadinimas</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
        </div>

        <div className="space-y-2">
          <Label>Komentaras</Label>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Pasirinkite užduotį</Label>
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={isSubmitting}>
            <SelectTrigger>
              <SelectValue placeholder="Pasirinkite užduotį" />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTaskId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Pasiekiami žingsniai</h3>
          {availableSteps.length === 0 ? (
            <div className="text-sm text-muted-foreground">Ši užduotis neturi žingsnių</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {availableSteps.map((step) => (
                <Card key={step.id} className="border-muted shadow-none">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-medium">{step.title}</div>
                    {step.contentText && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{step.contentText}</p>
                    )}
                    <Button size="sm" onClick={() => handleAddStep(step)} disabled={isSubmitting}>
                      Pridėti
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Šablono žingsniai</h3>
        {templateSteps.length === 0 ? (
          <div className="text-sm text-muted-foreground">Dar nepasirinkta žingsnių</div>
        ) : (
          <div className="space-y-3">
            {templateSteps.map((step, index) => (
              <Card key={step.taskStepId} className="border-muted shadow-none">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{step.taskStep.title}</div>
                      {step.taskStep.contentText && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {step.taskStep.contentText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(step.taskStepId, 'up')}
                          disabled={isSubmitting || index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(step.taskStepId, 'down')}
                          disabled={isSubmitting || index === templateSteps.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStep(step.taskStepId)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="outline">#{index + 1}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saugoma...
            </>
          ) : (
            'Išsaugoti'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Atšaukti
        </Button>
      </DialogFooter>
    </form>
  );
}

interface TemplateCardProps {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onReorder: (stepId: string, direction: 'up' | 'down') => void;
  disableActions: boolean;
  taskTitleById: Map<string, string>;
}

function TemplateCard({ template, onEdit, onDelete, onReorder, disableActions, taskTitleById }: TemplateCardProps) {
  const orderedSteps = [...template.steps].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
              {template.comment && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{template.comment}</p>
              )}
              <p className="text-sm text-muted-foreground">Žingsniai: {orderedSteps.length}</p>
            </div>

            <div className="space-y-3">
              {orderedSteps.map((step, index) => (
                <div key={step.id} className="rounded-md border border-muted px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{step.taskStep.title}</div>
                      {step.taskStep.contentText && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {step.taskStep.contentText}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Užduotis: {taskTitleById.get(step.taskStep.taskId) ?? '–'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorder(step.id, 'up')}
                          disabled={disableActions || index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorder(step.id, 'down')}
                          disabled={disableActions || index === orderedSteps.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Eilė: #{step.orderIndex}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} disabled={disableActions}>
              <Edit className="mr-2 w-4 h-4" />
              Redaguoti
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={disableActions}>
              <Trash2 className="mr-2 w-4 h-4 text-destructive" />
              Ištrinti
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

