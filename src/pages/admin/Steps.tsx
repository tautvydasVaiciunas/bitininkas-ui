import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ltMessages from '@/i18n/messages.lt.json';
import api from '@/lib/api';
import {
  mapTaskFromApi,
  mapTaskStepFromApi,
  type CreateTaskStepPayload,
  type Task,
  type TaskStep,
  type TaskStepMediaType,
  type UpdateTaskStepPayload,
} from '@/lib/types';

const messages = ltMessages.steps;

export default function AdminSteps() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [mediaType, setMediaType] = useState<TaskStepMediaType | ''>('');
  const [requireUserMedia, setRequireUserMedia] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidateSteps = () => {
    if (!selectedTaskId) return;
    void queryClient.invalidateQueries({ queryKey: ['tasks', selectedTaskId, 'steps'] });
    void queryClient.invalidateQueries({ queryKey: ['templates'] });
  };

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'for-steps'],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const stepsQueryKey = ['tasks', selectedTaskId, 'steps'] as const;
  const {
    data: steps = [],
    isLoading,
    isError,
  } = useQuery<TaskStep[]>({
    queryKey: stepsQueryKey,
    queryFn: () => api.tasks.getSteps(selectedTaskId!).then((response) => response.map(mapTaskStepFromApi)),
    enabled: !!selectedTaskId,
  });

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.orderIndex - b.orderIndex),
    [steps],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskStepPayload) => api.tasks.createStep(selectedTaskId!, payload),
    onSuccess: () => {
      toast.success(messages.createSuccess);
      setShowForm(false);
      setMediaType('');
      setRequireUserMedia(false);
      invalidateSteps();
    },
    onError: () => {
      toast.error(messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ stepId, payload }: { stepId: string; payload: UpdateTaskStepPayload }) =>
      api.tasks.updateStep(selectedTaskId!, stepId, payload),
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      setEditingStepId(null);
      invalidateSteps();
    },
    onError: () => {
      toast.error(messages.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (stepId: string) => api.tasks.deleteStep(selectedTaskId!, stepId),
    onSuccess: () => {
      toast.success(messages.deleteSuccess);
      invalidateSteps();
    },
    onError: () => {
      toast.error(messages.deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (payload: { stepId: string; orderIndex: number }[]) =>
      api.tasks.reorderSteps(selectedTaskId!, { steps: payload }),
    onSuccess: () => {
      toast.success(messages.reorderSuccess);
      invalidateSteps();
    },
    onError: () => {
      toast.error(messages.reorderError);
    },
  });

  const filteredSteps = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedSteps;
    return sortedSteps.filter((step) =>
      step.title.toLowerCase().includes(normalizedQuery) ||
      (step.contentText?.toLowerCase().includes(normalizedQuery) ?? false),
    );
  }, [sortedSteps, searchQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const mediaUrlValue = String(formData.get('mediaUrl') ?? '').trim();

    if (!title || !selectedTaskId) {
      toast.error(messages.validationError);
      return;
    }

    event.currentTarget.reset();
    setMediaType('');
    setRequireUserMedia(false);

    const payload: CreateTaskStepPayload = {
      title,
      contentText: content || description || undefined,
      requireUserMedia,
    };

    if (mediaUrlValue) {
      payload.mediaUrl = mediaUrlValue;
    }

    if (mediaType) {
      payload.mediaType = mediaType;
    }

    createMutation.mutate(payload);
  };

  const handleReorder = (stepId: string, direction: 'up' | 'down') => {
    if (!selectedTaskId || reorderMutation.isLoading) {
      return;
    }

    const currentIndex = sortedSteps.findIndex((step) => step.id === stepId);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sortedSteps.length) {
      return;
    }

    const updated = [...sortedSteps];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(swapIndex, 0, moved);

    const payload = updated.map((step, index) => ({ stepId: step.id, orderIndex: index + 1 }));
    reorderMutation.mutate(payload);
  };

  const handleUpdate = async (stepId: string, payload: UpdateTaskStepPayload) => {
    if (!selectedTaskId) return;
    await updateMutation.mutateAsync({ stepId, payload });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių žingsnius</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} disabled={!selectedTaskId} variant={showForm ? 'outline' : 'default'}>
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 w-4 h-4" />}
            {showForm ? 'Uždaryti formą' : 'Pridėti žingsnį'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taskSelect">Pasirinkite užduotį</Label>
            <Select value={selectedTaskId} onValueChange={(value) => setSelectedTaskId(value)}>
              <SelectTrigger id="taskSelect" className="mt-1">
                <SelectValue placeholder="Pasirinkite užduotį" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showForm && (
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Naujas žingsnis</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Pavadinimas <span className="text-destructive">*</span>
                    </Label>
                    <Input id="title" name="title" required disabled={createMutation.isLoading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Trumpas aprašymas</Label>
                    <Textarea id="description" name="description" rows={3} disabled={createMutation.isLoading} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="content">Turinys</Label>
                    <Textarea id="content" name="content" rows={4} disabled={createMutation.isLoading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">Media nuoroda</Label>
                    <Input id="mediaUrl" name="mediaUrl" placeholder="https://..." disabled={createMutation.isLoading} />
                  </div>

                  <div className="space-y-2">
                    <Label>Media tipas</Label>
                    <Select
                      value={mediaType || undefined}
                      onValueChange={(value: TaskStepMediaType) => setMediaType(value)}
                      disabled={createMutation.isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pasirinkite tipą" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Nuotrauka</SelectItem>
                        <SelectItem value="video">Vaizdo įrašas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 md:col-span-2">
                    <Checkbox
                      id="requireUserMedia"
                      checked={requireUserMedia}
                      onCheckedChange={(checked) => setRequireUserMedia(checked === true)}
                      disabled={createMutation.isLoading}
                    />
                    <Label htmlFor="requireUserMedia" className="cursor-pointer">
                      Reikia vartotojo nuotraukos
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isLoading}>
                    {createMutation.isLoading ? 'Sukuriama...' : 'Sukurti'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setMediaType('');
                      setRequireUserMedia(false);
                    }}
                  >
                    Atšaukti
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti žingsnių..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTaskId ? (
              <div className="text-center py-12 text-muted-foreground">Pirmiausia pasirinkite užduotį</div>
            ) : isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Kraunama...</div>
            ) : isError ? (
              <div className="text-center py-12 text-destructive">Nepavyko įkelti žingsnių.</div>
            ) : filteredSteps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Šiai užduočiai žingsnių dar nėra</div>
            ) : (
              <div className="space-y-4">
                {filteredSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    isEditing={editingStepId === step.id}
                    onEdit={() => setEditingStepId(step.id)}
                    onCancelEdit={() => setEditingStepId(null)}
                    onSave={handleUpdate}
                    onDelete={() => deleteMutation.mutate(step.id)}
                    disableActions={
                      deleteMutation.isLoading ||
                      reorderMutation.isLoading ||
                      (updateMutation.isLoading && editingStepId === step.id)
                    }
                    onMoveUp={() => handleReorder(step.id, 'up')}
                    onMoveDown={() => handleReorder(step.id, 'down')}
                    isFirst={index === 0}
                    isLast={index === filteredSteps.length - 1}
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

interface StepCardProps {
  step: TaskStep;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (stepId: string, payload: UpdateTaskStepPayload) => Promise<void>;
  onDelete: () => void;
  disableActions: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepCard({
  step,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  disableActions,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: StepCardProps) {
  const [title, setTitle] = useState(step.title);
  const [contentText, setContentText] = useState(step.contentText ?? '');
  const [mediaUrl, setMediaUrl] = useState(step.mediaUrl ?? '');
  const [mediaType, setMediaType] = useState<TaskStepMediaType | ''>(step.mediaType ?? '');
  const [requireUserMedia, setRequireUserMedia] = useState(step.requireUserMedia);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setTitle(step.title);
      setContentText(step.contentText ?? '');
      setMediaUrl(step.mediaUrl ?? '');
      setMediaType(step.mediaType ?? '');
      setRequireUserMedia(step.requireUserMedia);
    }
  }, [isEditing, step]);

  const mediaTypeLabel = step.mediaType === 'image' ? 'Nuotrauka' : step.mediaType === 'video' ? 'Vaizdo įrašas' : null;

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateTaskStepPayload = {
        title: trimmedTitle,
        contentText: contentText.trim() ? contentText.trim() : null,
        mediaUrl: mediaUrl.trim() ? mediaUrl.trim() : null,
        mediaType: mediaType || null,
        requireUserMedia,
      };

      await onSave(step.id, payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pavadinimas</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={isSaving} />
                </div>
                <div className="space-y-2">
                  <Label>Turinys</Label>
                  <Textarea
                    value={contentText}
                    onChange={(event) => setContentText(event.target.value)}
                    rows={4}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Media nuoroda</Label>
                    <Input
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      placeholder="https://..."
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Media tipas</Label>
                    <Select
                      value={mediaType || undefined}
                      onValueChange={(value: TaskStepMediaType) => setMediaType(value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pasirinkite tipą" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Nuotrauka</SelectItem>
                        <SelectItem value="video">Vaizdo įrašas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`require-media-${step.id}`}
                    checked={requireUserMedia}
                    onCheckedChange={(checked) => setRequireUserMedia(checked === true)}
                    disabled={isSaving}
                  />
                  <Label htmlFor={`require-media-${step.id}`} className="cursor-pointer">
                    Reikia vartotojo nuotraukos
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saugoma...' : 'Išsaugoti'}
                  </Button>
                  <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isSaving}>
                    Atšaukti
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <Badge variant="outline">#{step.orderIndex}</Badge>
                </div>
                {step.contentText && <p className="text-sm text-foreground mt-1 whitespace-pre-line">{step.contentText}</p>}
                {(step.mediaUrl || mediaTypeLabel || step.requireUserMedia) && (
                  <div className="flex flex-wrap gap-2 text-sm mt-3">
                    {step.mediaUrl && (
                      <a
                        href={step.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Peržiūrėti media
                      </a>
                    )}
                    {mediaTypeLabel && <Badge variant="secondary">{mediaTypeLabel}</Badge>}
                    {step.requireUserMedia && <Badge variant="secondary">Reikia vartotojo nuotraukos</Badge>}
                  </div>
                )}
              </div>
            )}
          </div>
          {!isEditing && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={disableActions || isFirst}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={disableActions || isLast}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={onEdit} disabled={disableActions}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={disableActions}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

