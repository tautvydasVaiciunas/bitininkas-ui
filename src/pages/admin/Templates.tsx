import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Thumbnail } from '@/components/media/Thumbnail';
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
import { applyImageFallback, isVideo, withApiBase } from '@/lib/media';
import {
  type CreateTemplatePayload,
  type Tag,
  type TaskStep,
  type Template,
  type TemplateStep,
  type UpdateTemplatePayload,
} from '@/lib/types';
import { mapTaskStepFromApi, mapTemplateFromApi } from '@/lib/mappers';

const messages = ltMessages.templates;

const truncateText = (value: string, limit = 120) => {
  const trimmed = value.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, limit - 1))}…`;
};

type TemplateStepDraft = {
  templateStepId?: string;
  taskStepId: string;
  taskStep: TaskStep;
};

type TemplateFormValues = {
  name: string;
  description: string;
  steps: TemplateStepDraft[];
};

export default function AdminTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const queryClient = useQueryClient();

  const templatesQueryKey = ['templates'] as const;

  const invalidateTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: templatesQueryKey });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTemplateToEdit(null);
    setDialogMode('create');
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
      const titleMatches = template.name.toLowerCase().includes(normalized);
      const stepMatches = template.steps.some((step) =>
        step.taskStep.title.toLowerCase().includes(normalized),
      );
      return titleMatches || stepMatches;
    });
  }, [templates, searchQuery]);

  const handleOpenCreate = () => {
    setTemplateToEdit(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setTemplateToEdit(template);
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(messages.deleteSuccess);
      if (templateToEdit?.id === id) {
        closeDialog();
      }
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
      toast.error(messages.noTitle);
      return;
    }

    const descriptionText = values.description.trim();
    const description = descriptionText.length > 0 ? descriptionText : null;
    const stepIds = values.steps.map((step) => step.taskStepId);

    try {
      if (templateToEdit) {
        const payload: UpdateTemplatePayload = {
          name,
          description,
          stepIds,
        };
        await updateMutation.mutateAsync({ id: templateToEdit.id, payload });
      } else {
        const payload: CreateTemplatePayload = {
          name,
          description: description ?? undefined,
          stepIds,
        };
        await createMutation.mutateAsync(payload);
      }

      toast.success(dialogMode === 'edit' ? messages.updateSuccess : messages.createSuccess);
      closeDialog();
      await invalidateTemplates();
    } catch (error) {
      showError(error, dialogMode === 'edit' ? messages.updateError : messages.createError);
    }
  };

  const handleDialogReorder = async (stepIds: string[]) => {
    if (!templateToEdit) {
      return;
    }

    const templateId = templateToEdit.id;

    try {
      await reorderMutation.mutateAsync({ id: templateId, stepIds });
      toast.success(messages.reorderSuccess);
      await invalidateTemplates();

      setTemplateToEdit((prev) => {
        if (!prev || prev.id !== templateId) {
          return prev;
        }

        const stepMap = new Map(prev.steps.map((step) => [step.id, step]));
        const reorderedSteps = stepIds
          .map((templateStepId, index) => {
            const step = stepMap.get(templateStepId);
            return step ? { ...step, orderIndex: index } : null;
          })
          .filter((step): step is Template['steps'][number] => Boolean(step));

        return { ...prev, steps: reorderedSteps };
      });
    } catch (error) {
      showError(error, messages.reorderError);
      throw error;
    }
  };

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;
  const isReordering = reorderMutation.isLoading;

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
            if (open) {
              setIsDialogOpen(true);
            } else {
              closeDialog();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{dialogMode === 'edit' ? 'Redaguoti šabloną' : 'Naujas šablonas'}</DialogTitle>
              <DialogDescription>
                {dialogMode === 'edit'
                  ? 'Atnaujinkite šablono informaciją ir jo žingsnių tvarką.'
                  : 'Pasirinkite globalius žingsnius, sudėliokite jų eiliškumą ir sukurkite šabloną.'}
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              key={templateToEdit?.id ?? 'new'}
              template={templateToEdit}
              tags={tags}
              onCancel={closeDialog}
              onSubmit={handleFormSubmit}
              onReorderSteps={templateToEdit ? handleDialogReorder : undefined}
              isSubmitting={isSubmitting}
              isReordering={isReordering}
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
                    disableActions={isSubmitting || deleteMutation.isLoading || isReordering}
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
  onReorderSteps?: (templateStepIds: string[]) => Promise<void>;
  isSubmitting: boolean;
  isReordering: boolean;
};

function TemplateForm({
  template,
  tags,
  onCancel,
  onSubmit,
  onReorderSteps,
  isSubmitting,
  isReordering,
}: TemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
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
  const [previewStep, setPreviewStep] = useState<TaskStep | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setName(template?.name ?? '');
    setDescription(template?.description ?? '');
    setSelectedTagId('');
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
    data: availableStepsRaw = [],
    isLoading: areStepsLoading,
    isError: stepsError,
  } = useQuery<TaskStep[]>({
    queryKey: ['steps', 'global', selectedTagId || 'all'],
    queryFn: async () => {
      const response = await api.steps.listGlobal(selectedTagId ? { tagId: selectedTagId } : undefined);
      return response.map(mapTaskStepFromApi);
    },
  });

  const availableSteps = useMemo(
    () =>
      availableStepsRaw.filter((step) => typeof step.id === 'string' && step.id.length > 0),
    [availableStepsRaw],
  );

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

  const handleReorder = async (taskStepId: string, direction: 'up' | 'down') => {
    if (isReordering) {
      return;
    }

    const index = templateSteps.findIndex((step) => step.taskStepId === taskStepId);
    if (index === -1) {
      return;
    }

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= templateSteps.length) {
      return;
    }

    const previous = templateSteps.map((step) => ({ ...step }));
    const updated = [...templateSteps];
    const [moved] = updated.splice(index, 1);
    updated.splice(swapIndex, 0, moved);
    setTemplateSteps(updated);

    const canPersistReorder =
      template?.id &&
      typeof onReorderSteps === 'function' &&
      updated.every((step) => Boolean(step.templateStepId));

    if (canPersistReorder) {
      const templateStepIds = updated.map((step) => step.templateStepId!) as string[];
      try {
        await onReorderSteps!(templateStepIds);
      } catch {
        setTemplateSteps(previous);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name, description, steps: templateSteps });
  };

  const openPreview = (step: TaskStep) => {
    setPreviewStep(step);
    setIsPreviewOpen(true);
  };

  const selectableTags = useMemo(
    () => tags.filter((tag) => typeof tag.id === 'string' && tag.id.length > 0),
    [tags],
  );

  const tagSelectValue = selectedTagId === '' ? 'all' : selectedTagId;
  const trimmedName = name.trim();
  const previewName =
    trimmedName.length > 0
      ? trimmedName.length > 120
        ? `${trimmedName.slice(0, 117)}…`
        : trimmedName
      : 'Be pavadinimo';
  const trimmedDescription = description.trim();
  const previewDescriptionText =
    trimmedDescription.length > 160 ? `${trimmedDescription.slice(0, 157)}…` : trimmedDescription;
  const previewDescription = previewDescriptionText || 'Aprašymas nepateiktas';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-title">Pavadinimas</Label>
          <Input
            id="template-title"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="template-description">Aprašymas</Label>
          <Textarea
            id="template-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
        <div className="md:col-span-2">
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Peržiūra
              </span>
              <div className="text-lg font-semibold break-words">{previewName}</div>
              <p className="text-sm text-muted-foreground line-clamp-3">{previewDescription}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Globalūs žingsniai</Label>
            <Select
              value={tagSelectValue}
              onValueChange={(value) => setSelectedTagId(value === 'all' ? '' : value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Visos žymos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Visos žymos</SelectItem>
                {selectableTags.map((tag) => (
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
                        type="button"
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
                    <div className="flex items-start gap-3">
                      <Thumbnail
                        url={step.taskStep.mediaUrl}
                        className="w-24 h-20"
                        onClick={() => openPreview(step.taskStep)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium">{step.taskStep.title}</div>
                        {step.taskStep.contentText ? (
                          <p className="text-sm text-muted-foreground">
                            {truncateText(step.taskStep.contentText)}
                          </p>
                        ) : null}
                        <StepTagList tags={step.taskStep.tags ?? []} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap gap-1 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(step.taskStepId, 'up')}
                            disabled={isSubmitting || isReordering || index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(step.taskStepId, 'down')}
                            disabled={isSubmitting || isReordering || index === templateSteps.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openPreview(step.taskStep)}
                          >
                            Peržiūra
                          </Button>
                        </div>
                        <Button
                          type="button"
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
      <StepPreviewDialog
        step={previewStep}
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewStep(null);
          }
        }}
      />
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
  const [previewStep, setPreviewStep] = useState<TaskStep | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {template.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Žingsniai: {orderedSteps.length}</p>
            </div>

            <div className="space-y-3">
              {orderedSteps.map((step, index) => (
                <div key={step.id} className="rounded-md border border-muted px-3 py-2 space-y-2">
                  <div className="flex items-start gap-3">
                    <Thumbnail
                      url={step.taskStep.mediaUrl}
                      className="w-24 h-20"
                      onClick={() => {
                        setPreviewStep(step.taskStep);
                        setIsPreviewOpen(true);
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{step.taskStep.title}</div>
                      {step.taskStep.contentText ? (
                        <p className="text-xs text-muted-foreground">
                          {truncateText(step.taskStep.contentText)}
                        </p>
                      ) : null}
                      <StepTagList tags={step.taskStep.tags ?? []} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorder(step.id, 'up')}
                          disabled={disableActions || index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorder(step.id, 'down')}
                          disabled={disableActions || index === orderedSteps.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPreviewStep(step.taskStep);
                            setIsPreviewOpen(true);
                          }}
                        >
                          Peržiūra
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Eilė: #{step.orderIndex + 1}</div>
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
      <StepPreviewDialog
        step={previewStep}
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewStep(null);
          }
        }}
      />
    </Card>
  );
}

type StepTagListProps = {
  tags: TaskStep['tags'];
};

function StepTagList({ tags }: StepTagListProps) {
  const visibleTags = (tags ?? []).filter(
    (tag): tag is NonNullable<TaskStep['tags']>[number] & { id: string } =>
      Boolean(tag) && typeof tag.id === 'string' && tag.id.length > 0,
  );

  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Badge key={tag.id} variant="secondary">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

type StepPreviewDialogProps = {
  step: TaskStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function StepPreviewDialog({ step, open, onOpenChange }: StepPreviewDialogProps) {
  const [videoError, setVideoError] = useState(false);
  const mediaUrl = step?.mediaUrl ? withApiBase(step.mediaUrl) : null;
  const showVideo = mediaUrl ? isVideo(step?.mediaUrl ?? mediaUrl) : false;

  useEffect(() => {
    setVideoError(false);
  }, [step?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg space-y-4">
        <DialogHeader>
          <DialogTitle>{step?.title ?? 'Žingsnio peržiūra'}</DialogTitle>
          <DialogDescription>
            {step?.contentText && step.contentText.trim().length > 0
              ? step.contentText
              : 'Šiam žingsniui aprašymas nepateiktas.'}
          </DialogDescription>
        </DialogHeader>
        {mediaUrl ? (
          showVideo ? (
            videoError ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-muted-foreground">
                Nepavyko įkelti vaizdo įrašo.
              </div>
            ) : (
              <video
                key={mediaUrl}
                src={mediaUrl}
                controls
                preload="metadata"
                className="w-full rounded-lg border border-border bg-black"
                crossOrigin="anonymous"
                onError={() => setVideoError(true)}
              />
            )
          ) : (
            <img
              src={mediaUrl}
              alt={step?.title ?? 'Žingsnio iliustracija'}
              className="w-full rounded-lg border border-border object-cover"
              crossOrigin="anonymous"
              onError={(event) => applyImageFallback(event.currentTarget)}
            />
          )
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-muted-foreground">
            Medija nepateikta.
          </div>
        )}
        <StepTagList tags={step?.tags ?? []} />
      </DialogContent>
    </Dialog>
  );
}
