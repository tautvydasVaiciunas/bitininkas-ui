import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  mapTaskStepFromApi,
  mapTemplateFromApi,
  type CreateTemplatePayload,
  type Tag,
  type TaskStep,
  type Template,
  type UpdateTemplatePayload,
} from '@/lib/types';

const messages = ltMessages.templates;

type TemplateStepDraft = {
  templateStepId?: string;
  taskStepId: string;
  taskStep: TaskStep;
};

type TemplateFormValues = {
  name: string;
  comment: string;
  steps: TemplateStepDraft[];
};

const buildTemplateStepOrder = (template: Template, drafts: TemplateStepDraft[]) => {
  const lookup = new Map(template.steps.map((step) => [step.taskStepId, step.id] as const));
  return drafts
    .map((draft) => lookup.get(draft.taskStepId))
    .filter((value): value is string => typeof value === 'string');
};

export default function AdminTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const queryClient = useQueryClient();

  const templatesQueryKey = ['templates'] as const;

  const invalidateTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: templatesQueryKey });
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
    queryKey: templatesQueryKey,
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.tags.list();
      return response.map((tag) => ({ ...tag }));
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      api.templates.create(payload).then(mapTemplateFromApi),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      api.templates.update(id, payload).then(mapTemplateFromApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.templates.remove(id),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, stepIds }: { id: string; stepIds: string[] }) =>
      api.templates.reorderSteps(id, { stepIds }).then(mapTemplateFromApi),
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

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(messages.deleteSuccess);
      await invalidateTemplates();
    } catch (error) {
      showError(error, messages.deleteError);
    }
  };

  const handleCardReorder = async (
    template: Template,
    templateStepId: string,
    direction: 'up' | 'down',
  ) => {
    if (reorderMutation.isLoading) {
      return;
    }

    const ordered = [...template.steps].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = ordered.findIndex((step) => step.id === templateStepId);
    if (index === -1) {
      return;
    }

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) {
      return;
    }

    const updated = [...ordered];
    const [moved] = updated.splice(index, 1);
    updated.splice(swapIndex, 0, moved);

    const stepIds = updated.map((step) => step.id);

    try {
      await reorderMutation.mutateAsync({ id: template.id, stepIds });
      toast.success(messages.reorderSuccess);
      await invalidateTemplates();
    } catch (error) {
      showError(error, messages.reorderError);
    }
  };

  const handleFormSubmit = async (values: TemplateFormValues) => {
    const name = values.name.trim();
    if (!name) {
      toast.error(messages.noName);
      return;
    }

    const commentText = values.comment.trim();
    const comment = commentText.length > 0 ? commentText : null;
    const taskStepIds = values.steps.map((step) => step.taskStepId);

    if (taskStepIds.length === 0) {
      toast.error('Pridėkite bent vieną žingsnį');
      return;
    }

    try {
      let templateResult: Template;

      if (templateToEdit) {
        const payload: UpdateTemplatePayload = {
          name,
          comment,
          stepIds: taskStepIds.length ? taskStepIds : undefined,
        };
        templateResult = await updateMutation.mutateAsync({ id: templateToEdit.id, payload });
      } else {
        const payload: CreateTemplatePayload = {
          name,
          comment: comment ?? undefined,
          stepIds: taskStepIds.length ? taskStepIds : undefined,
        };
        templateResult = await createMutation.mutateAsync(payload);
      }

      if (taskStepIds.length > 0) {
        const orderedTemplateStepIds = buildTemplateStepOrder(templateResult, values.steps);
        if (orderedTemplateStepIds.length !== values.steps.length) {
          toast.error(messages.reorderError);
          return;
        }

        try {
          await reorderMutation.mutateAsync({ id: templateResult.id, stepIds: orderedTemplateStepIds });
        } catch (error) {
          showError(error, messages.reorderError);
          return;
        }
      }

      toast.success(templateToEdit ? messages.updateSuccess : messages.createSuccess);
      closeDialog();
      await invalidateTemplates();
    } catch (error) {
      showError(error, templateToEdit ? messages.updateError : messages.createError);
    }
  };

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading || reorderMutation.isLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Šablonai</h1>
            <p className="text-muted-foreground mt-1">
              Kurkite ir tvarkykite šablonus naudodami globalius žingsnius
            </p>
          </div>
          <Button onClick={handleOpenCreate} disabled={isSubmitting}>
            {createMutation.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 w-4 h-4" />
            )}
            {createMutation.isLoading ? 'Kuriama…' : 'Sukurti šabloną'}
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{templateToEdit ? 'Redaguoti šabloną' : 'Naujas šablonas'}</DialogTitle>
              <DialogDescription>
                {templateToEdit
                  ? 'Atnaujinkite šablono informaciją ir jo žingsnių tvarką.'
                  : 'Pasirinkite globalius žingsnius, sudėliokite jų eiliškumą ir sukurkite šabloną.'}
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              template={templateToEdit}
              tags={tags}
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
                placeholder="Ieškoti šablonų…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Kraunama…</div>
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
                    onDelete={() => handleDelete(template.id)}
                    onReorder={(stepId, direction) => handleCardReorder(template, stepId, direction)}
                    disableActions={
                      isSubmitting || deleteMutation.isLoading || reorderMutation.isLoading
                    }
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

type TemplateFormProps = {
  template: Template | null;
  tags: Tag[];
  onCancel: () => void;
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  isSubmitting: boolean;
};

function TemplateForm({ template, tags, onCancel, onSubmit, isSubmitting }: TemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [comment, setComment] = useState(template?.comment ?? '');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [templateSteps, setTemplateSteps] = useState<TemplateStepDraft[]>(
    template
      ? [...template.steps]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((step) => ({
            templateStepId: step.id,
            taskStepId: step.taskStepId,
            taskStep: step.taskStep,
          }))
      : [],
  );

  useEffect(() => {
    setName(template?.name ?? '');
    setComment(template?.comment ?? '');
    setTemplateSteps(
      template
        ? [...template.steps]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((step) => ({
              templateStepId: step.id,
              taskStepId: step.taskStepId,
              taskStep: step.taskStep,
            }))
        : [],
    );
  }, [template]);

  const selectedTaskStepIds = useMemo(
    () => new Set(templateSteps.map((step) => step.taskStepId)),
    [templateSteps],
  );

  const {
    data: availableSteps = [],
    isLoading: areStepsLoading,
    isError: stepsError,
  } = useQuery<TaskStep[]>({
    queryKey: ['steps', 'global', selectedTagId || 'all'],
    queryFn: async () => {
      const response = await api.steps.listGlobal(selectedTagId ? { tagId: selectedTagId } : undefined);
      return response.map(mapTaskStepFromApi);
    },
  });

  const handleAddStep = (step: TaskStep) => {
    if (selectedTaskStepIds.has(step.id)) {
      toast.error(messages.stepExists);
      return;
    }

    setTemplateSteps((prev) => [...prev, { taskStepId: step.id, taskStep: step }]);
    toast.success(messages.stepAdded);
  };

  const handleRemoveStep = (taskStepId: string) => {
    setTemplateSteps((prev) => prev.filter((step) => step.taskStepId !== taskStepId));
  };

  const handleReorder = (taskStepId: string, direction: 'up' | 'down') => {
    const index = templateSteps.findIndex((step) => step.taskStepId === taskStepId);
    if (index === -1) {
      return;
    }

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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-name">Pavadinimas</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="template-comment">Komentaras</Label>
          <Textarea
            id="template-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Globalūs žingsniai</Label>
            <Select
              value={selectedTagId}
              onValueChange={setSelectedTagId}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Visos žymos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Visos žymos</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stepsError ? (
            <div className="py-8 text-center text-destructive">Nepavyko įkelti žingsnių.</div>
          ) : areStepsLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : availableSteps.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Žingsnių nėra</div>
          ) : (
            <div className="space-y-3">
              {availableSteps.map((step) => {
                const alreadySelected = selectedTaskStepIds.has(step.id);
                return (
                  <Card key={step.id} className="border-muted shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{step.title}</div>
                        {step.contentText && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{step.contentText}</p>
                        )}
                        <StepTagList tags={step.tags ?? []} />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddStep(step)}
                        disabled={isSubmitting || alreadySelected}
                      >
                        {alreadySelected ? 'Pridėta' : 'Pridėti'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Šablono žingsniai</Label>
            <span className="text-sm text-muted-foreground">{templateSteps.length} žingsniai</span>
          </div>
          {templateSteps.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Dar nepasirinkta žingsnių</div>
          ) : (
            <div className="space-y-3">
              {templateSteps.map((step, index) => (
                <Card key={step.taskStepId} className="border-muted shadow-none">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="font-medium">{step.taskStep.title}</div>
                        {step.taskStep.contentText && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {step.taskStep.contentText}
                          </p>
                        )}
                        <StepTagList tags={step.taskStep.tags ?? []} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
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
      </div>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saugoma…
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

type TemplateCardProps = {
  template: Template;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
  onReorder: (stepId: string, direction: 'up' | 'down') => Promise<void> | void;
  disableActions: boolean;
};

function TemplateCard({ template, onEdit, onDelete, onReorder, disableActions }: TemplateCardProps) {
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
                <div key={step.id} className="rounded-md border border-muted px-3 py-2 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{step.taskStep.title}</div>
                      {step.taskStep.contentText && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {step.taskStep.contentText}
                        </p>
                      )}
                      <StepTagList tags={step.taskStep.tags ?? []} />
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
                  <div className="text-xs text-muted-foreground">Eilė: #{step.orderIndex}</div>
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

type StepTagListProps = {
  tags: TaskStep['tags'];
};

function StepTagList({ tags }: StepTagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
