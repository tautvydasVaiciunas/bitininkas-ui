import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Edit,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapTaskFromApi,
  mapTaskStepFromApi,
  type CreateTaskStepPayload,
  type Tag,
  type Task,
  type TaskStep,
  type TaskStepMediaType,
  type UpdateTaskStepPayload,
} from '@/lib/types';

const messages = ltMessages.steps;

const tagMessages = ltMessages.tags;

type StepFormState = {
  title: string;
  description: string;
  content: string;
  mediaUrl: string;
  mediaType: TaskStepMediaType | '';
  requireUserMedia: boolean;
  tagIds: string[];
};

type EditFormState = StepFormState & {
  orderIndex: string;
};

type TagMultiSelectOption = {
  id: string;
  name: string;
};

type StepCardProps = {
  step: TaskStep;
  onEdit: (step: TaskStep) => void;
  onDelete: (step: TaskStep) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableActions?: boolean;
  taskTitle?: string;
};

type TagManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  isLoading: boolean;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type TagEditorState = Record<string, string>;

function buildDefaultCreateForm(): StepFormState {
  return {
    title: '',
    description: '',
    content: '',
    mediaUrl: '',
    mediaType: '',
    requireUserMedia: false,
    tagIds: [],
  };
}

function buildDefaultEditForm(): EditFormState {
  return {
    ...buildDefaultCreateForm(),
    orderIndex: '',
  };
}
export default function AdminSteps() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [stepToEdit, setStepToEdit] = useState<TaskStep | null>(null);
  const [stepToDelete, setStepToDelete] = useState<TaskStep | null>(null);
  const [createForm, setCreateForm] = useState<StepFormState>(buildDefaultCreateForm);
  const [editForm, setEditForm] = useState<EditFormState>(buildDefaultEditForm);
  const [isUploadingCreateMedia, setIsUploadingCreateMedia] = useState(false);
  const [isUploadingEditMedia, setIsUploadingEditMedia] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const showError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      toast.error(error.message);
      return;
    }
    toast.error(fallback);
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

  const { data: tags = [], isLoading: tagsLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.tags.list();
      return response;
    },
  });

  useEffect(() => {
    if (selectedTagId && !tags.some((tag) => tag.id === selectedTagId)) {
      setSelectedTagId('');
    }
  }, [selectedTagId, tags]);

  const tagOptions: TagMultiSelectOption[] = useMemo(
    () => tags.map((tag) => ({ id: tag.id, name: tag.name })),
    [tags],
  );

  const tagFilterOptions = useMemo(
    () => [{ id: '', name: 'Visos žymos' }, ...tagOptions],
    [tagOptions],
  );

  const taskTitleById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title] as const)),
    [tasks],
  );

  const tagKey = selectedTagId || 'all';
  const stepsQueryKey = showAllSteps
    ? ['steps', 'global', tagKey]
    : ['tasks', selectedTaskId || 'none', 'steps', tagKey];

  const {
    data: steps = [],
    isLoading: stepsLoading,
    isError: stepsError,
  } = useQuery<TaskStep[]>({
    queryKey: stepsQueryKey,
    queryFn: async () => {
      if (showAllSteps) {
        const response = await api.steps.listGlobal(selectedTagId ? { tagId: selectedTagId } : undefined);
        return response.map(mapTaskStepFromApi);
      }
      if (!selectedTaskId) {
        return [];
      }
      const response = await api.tasks.getSteps(
        selectedTaskId,
        selectedTagId ? { tagId: selectedTagId } : undefined,
      );
      return response.map(mapTaskStepFromApi);
    },
    enabled: showAllSteps || Boolean(selectedTaskId),
  });

  const sortedSteps = useMemo(() => {
    if (showAllSteps) {
      return [...steps];
    }
    return [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [showAllSteps, steps]);

  const filteredSteps = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortedSteps;
    }

    return sortedSteps.filter((step) => {
      const matchesTitle = step.title.toLowerCase().includes(normalizedQuery);
      const matchesContent = step.contentText?.toLowerCase().includes(normalizedQuery) ?? false;
      const matchesTask = taskTitleById.get(step.taskId)?.toLowerCase().includes(normalizedQuery) ?? false;
      return matchesTitle || matchesContent || matchesTask;
    });
  }, [searchQuery, sortedSteps, taskTitleById]);

  const invalidateStepQueries = (taskId?: string) => {
    if (taskId) {
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.length >= 3 &&
            key[0] === 'tasks' &&
            key[1] === taskId &&
            key[2] === 'steps'
          );
        },
      });
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'steps', 'for-template'] });
    }

    void queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'steps',
    });

    void queryClient.invalidateQueries({ queryKey: ['templates'] });
  };

  const resetCreateForm = () => {
    setCreateForm(buildDefaultCreateForm());
    setIsUploadingCreateMedia(false);
  };

  const resetEditForm = () => {
    setEditForm(buildDefaultEditForm());
    setIsUploadingEditMedia(false);
  };

  const openEditDialog = (step: TaskStep) => {
    setStepToEdit(step);
    setEditForm({
      title: step.title,
      description: step.contentText ?? '',
      content: step.contentText ?? '',
      mediaUrl: step.mediaUrl ?? '',
      mediaType: step.mediaType ?? '',
      requireUserMedia: step.requireUserMedia ?? false,
      orderIndex: String(step.orderIndex ?? ''),
      tagIds: step.tags?.map((tag) => tag.id) ?? [],
    });
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setStepToEdit(null);
    resetEditForm();
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { taskId: string; data: CreateTaskStepPayload }) => {
      const response = await api.tasks.createStep(payload.taskId, payload.data);
      return mapTaskStepFromApi(response);
    },
    onSuccess: (createdStep) => {
      toast.success(messages.createSuccess);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      invalidateStepQueries(createdStep.taskId);
    },
    onError: (error) => {
      showError(error, messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ step, data }: { step: TaskStep; data: UpdateTaskStepPayload }) => {
      const response = await api.tasks.updateStep(step.taskId, step.id, data);
      return mapTaskStepFromApi(response);
    },
    onSuccess: (updatedStep) => {
      toast.success(messages.updateSuccess);
      closeEditDialog();
      invalidateStepQueries(updatedStep.taskId);
    },
    onError: (error) => {
      showError(error, messages.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (step: TaskStep) => {
      await api.tasks.deleteStep(step.taskId, step.id);
      return step;
    },
    onSuccess: (deletedStep) => {
      toast.success(messages.deleteSuccess);
      invalidateStepQueries(deletedStep.taskId);
    },
    onError: (error) => {
      showError(error, messages.deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: { stepId: string; orderIndex: number }[] }) => {
      const response = await api.tasks.reorderSteps(taskId, { steps: payload });
      return response.map(mapTaskStepFromApi);
    },
    onSuccess: (_reordered, variables) => {
      toast.success(messages.reorderSuccess);
      invalidateStepQueries(variables.taskId);
    },
    onError: (error) => {
      showError(error, messages.reorderError);
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.tags.create({ name });
      return response;
    },
    onSuccess: () => {
      toast.success(tagMessages.createSuccess);
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, tagMessages.errorFallback);
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await api.tags.update(id, { name });
      return response;
    },
    onSuccess: () => {
      toast.success(tagMessages.updateSuccess);
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, tagMessages.errorFallback);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.tags.remove(id);
    },
    onSuccess: () => {
      toast.success(tagMessages.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, tagMessages.errorFallback);
    },
  });

  const createFormDisabled = createMutation.isLoading || isUploadingCreateMedia;
  const editFormDisabled = updateMutation.isLoading || isUploadingEditMedia;
  const disableStepActions =
    deleteMutation.isLoading || reorderMutation.isLoading || updateMutation.isLoading || createMutation.isLoading;
  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTaskId) {
      toast.error(messages.validationError);
      return;
    }

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationError);
      return;
    }

    const payload: CreateTaskStepPayload = {
      title: trimmedTitle,
      contentText: createForm.content.trim() || createForm.description.trim() || undefined,
      mediaUrl: createForm.mediaUrl.trim() || undefined,
      mediaType: createForm.mediaType || null,
      requireUserMedia: createForm.requireUserMedia,
      tagIds: createForm.tagIds,
    };

    await createMutation.mutateAsync({ taskId: selectedTaskId, data: payload });
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stepToEdit) {
      return;
    }

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationError);
      return;
    }

    const parsedOrderIndex = Number(editForm.orderIndex);
    if (!Number.isFinite(parsedOrderIndex) || parsedOrderIndex <= 0) {
      toast.error(messages.orderIndexInvalid);
      return;
    }

    const payload: UpdateTaskStepPayload = {
      title: trimmedTitle,
      contentText: editForm.content.trim()
        ? editForm.content.trim()
        : editForm.description.trim()
        ? editForm.description.trim()
        : null,
      mediaUrl: editForm.mediaUrl.trim() ? editForm.mediaUrl.trim() : null,
      mediaType: editForm.mediaType || null,
      requireUserMedia: editForm.requireUserMedia,
      orderIndex: parsedOrderIndex,
      tagIds: editForm.tagIds,
    };

    await updateMutation.mutateAsync({ step: stepToEdit, data: payload });
  };

  const handleCreateMediaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCreateMedia(true);
    try {
      const response = await api.media.upload(file);
      setCreateForm((prev) => ({ ...prev, mediaUrl: response.url }));
      if (!createForm.mediaType) {
        setCreateForm((prev) => ({
          ...prev,
          mediaType: file.type === 'video/mp4' ? 'video' : 'image',
        }));
      }
      toast.success(messages.uploadSuccess);
    } catch (error) {
      console.error('Failed to upload media', error);
      toast.error(messages.uploadError);
    } finally {
      setIsUploadingCreateMedia(false);
      event.target.value = '';
    }
  };

  const handleEditMediaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingEditMedia(true);
    try {
      const response = await api.media.upload(file);
      setEditForm((prev) => ({
        ...prev,
        mediaUrl: response.url,
        mediaType: prev.mediaType || (file.type === 'video/mp4' ? 'video' : 'image'),
      }));
      toast.success(messages.uploadSuccess);
    } catch (error) {
      console.error('Failed to upload media', error);
      toast.error(messages.uploadError);
    } finally {
      setIsUploadingEditMedia(false);
      event.target.value = '';
    }
  };

  const handleReorder = (stepId: string, direction: 'up' | 'down') => {
    if (showAllSteps || !selectedTaskId || reorderMutation.isLoading) {
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
    reorderMutation.mutate({ taskId: selectedTaskId, payload });
  };

  const tagManagerHandlers = {
    onCreate: async (name: string) => {
      await createTagMutation.mutateAsync(name);
    },
    onUpdate: async (id: string, name: string) => {
      await updateTagMutation.mutateAsync({ id, name });
    },
    onDelete: async (id: string) => {
      await deleteTagMutation.mutateAsync(id);
    },
  };
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių žingsnius</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setIsTagManagerOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Tvarkyti žymas…
            </Button>
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
                <Button disabled={createFormDisabled || (!selectedTaskId && !showAllSteps)}>
                  {createMutation.isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {createMutation.isLoading ? 'Sukuriama…' : 'Pridėti žingsnį'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Naujas žingsnis</DialogTitle>
                  <DialogDescription>Užpildykite informaciją apie žingsnį.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="create-step-title">Pavadinimas</Label>
                      <Input
                        id="create-step-title"
                        value={createForm.title}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        disabled={createFormDisabled}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-step-description">Trumpas aprašymas</Label>
                      <Textarea
                        id="create-step-description"
                        value={createForm.description}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        disabled={createFormDisabled}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="create-step-content">Turinys</Label>
                      <Textarea
                        id="create-step-content"
                        value={createForm.content}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, content: event.target.value }))
                        }
                        disabled={createFormDisabled}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-step-media-url">Media nuoroda</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="create-step-media-url"
                          value={createForm.mediaUrl}
                          onChange={(event) =>
                            setCreateForm((prev) => ({ ...prev, mediaUrl: event.target.value }))
                          }
                          placeholder="https://…"
                          disabled={createFormDisabled}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => createFileInputRef.current?.click()}
                            disabled={createFormDisabled}
                          >
                            {isUploadingCreateMedia ? 'Įkeliama…' : 'Įkelti failą'}
                          </Button>
                        </div>
                      </div>
                      <input
                        type="file"
                        ref={createFileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,video/mp4"
                        onChange={handleCreateMediaFileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Media tipas</Label>
                      <Select
                        value={createForm.mediaType || undefined}
                        onValueChange={(value: TaskStepMediaType) =>
                          setCreateForm((prev) => ({ ...prev, mediaType: value }))
                        }
                        disabled={createFormDisabled}
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
                    <div className="space-y-2 md:col-span-2">
                      <Label>Žymos</Label>
                      <TagMultiSelect
                        options={tagOptions}
                        value={createForm.tagIds}
                        onChange={(next) => setCreateForm((prev) => ({ ...prev, tagIds: next }))}
                        placeholder={tagsLoading ? 'Kraunama…' : 'Pasirinkite žymas'}
                        disabled={createFormDisabled || tagsLoading}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="create-require-media"
                      checked={createForm.requireUserMedia}
                      onCheckedChange={(checked) =>
                        setCreateForm((prev) => ({ ...prev, requireUserMedia: checked === true }))
                      }
                      disabled={createFormDisabled}
                    />
                    <Label htmlFor="create-require-media" className="cursor-pointer">
                      Reikia vartotojo nuotraukos/video
                    </Label>
                  </div>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetCreateForm();
                      }}
                      disabled={createFormDisabled}
                    >
                      Atšaukti
                    </Button>
                    <Button type="submit" disabled={createFormDisabled}>
                      {createMutation.isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saugoma…
                        </>
                      ) : (
                        'Saugoti'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-select">Pasirinkite užduotį</Label>
              <Select
                value={selectedTaskId || undefined}
                onValueChange={(value) => setSelectedTaskId(value)}
              >
                <SelectTrigger id="task-select" className="w-full">
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

            <div className="space-y-2">
              <Label htmlFor="tag-filter">Filtruoti pagal žymą</Label>
              <Select value={selectedTagId} onValueChange={(value) => setSelectedTagId(value)}>
                <SelectTrigger id="tag-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagFilterOptions.map((tag) => (
                    <SelectItem key={tag.id || 'all'} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-input px-4 py-3">
              <div>
                <p className="font-medium">Rodyti visus žingsnius</p>
                <p className="text-sm text-muted-foreground">
                  Įjungus bus rodomi visi žingsniai iš visų užduočių
                </p>
              </div>
              <Switch checked={showAllSteps} onCheckedChange={setShowAllSteps} />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ieškoti žingsnių"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {stepsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stepsError ? (
              <div className="rounded-md border border-destructive bg-destructive/10 p-6 text-destructive">
                Nepavyko įkelti žingsnių
              </div>
            ) : filteredSteps.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                Žingsnių nerasta
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSteps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    taskTitle={taskTitleById.get(step.taskId)}
                    onEdit={openEditDialog}
                    onDelete={setStepToDelete}
                    onMoveUp={showAllSteps ? undefined : () => handleReorder(step.id, 'up')}
                    onMoveDown={showAllSteps ? undefined : () => handleReorder(step.id, 'down')}
                    disableActions={disableStepActions}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => (open ? undefined : closeEditDialog())}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redaguoti žingsnį</DialogTitle>
              <DialogDescription>
                {stepToEdit ? `Atnaujinkite žingsnio „${stepToEdit.title}“ informaciją.` : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-step-title">Pavadinimas</Label>
                  <Input
                    id="edit-step-title"
                    value={editForm.title}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                    disabled={editFormDisabled}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-step-description">Trumpas aprašymas</Label>
                  <Textarea
                    id="edit-step-description"
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    disabled={editFormDisabled}
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-step-content">Turinys</Label>
                  <Textarea
                    id="edit-step-content"
                    value={editForm.content}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, content: event.target.value }))}
                    disabled={editFormDisabled}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-step-media-url">Media nuoroda</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="edit-step-media-url"
                      value={editForm.mediaUrl}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                      placeholder="https://…"
                      disabled={editFormDisabled}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={editFormDisabled}
                      >
                        {isUploadingEditMedia ? 'Įkeliama…' : 'Įkelti failą'}
                      </Button>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,video/mp4"
                    onChange={handleEditMediaFileChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Media tipas</Label>
                  <Select
                    value={editForm.mediaType || undefined}
                    onValueChange={(value: TaskStepMediaType) =>
                      setEditForm((prev) => ({ ...prev, mediaType: value }))
                    }
                    disabled={editFormDisabled}
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Žymos</Label>
                  <TagMultiSelect
                    options={tagOptions}
                    value={editForm.tagIds}
                    onChange={(next) => setEditForm((prev) => ({ ...prev, tagIds: next }))}
                    placeholder={tagsLoading ? 'Kraunama…' : 'Pasirinkite žymas'}
                    disabled={editFormDisabled || tagsLoading}
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    id="edit-require-media"
                    checked={editForm.requireUserMedia}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({ ...prev, requireUserMedia: checked === true }))
                    }
                    disabled={editFormDisabled}
                  />
                  <Label htmlFor="edit-require-media" className="cursor-pointer">
                    Reikia vartotojo nuotraukos/video
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-step-order">Eilės numeris</Label>
                  <Input
                    id="edit-step-order"
                    type="number"
                    min={1}
                    value={editForm.orderIndex}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, orderIndex: event.target.value }))
                    }
                    disabled={editFormDisabled}
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditDialog}
                  disabled={editFormDisabled}
                >
                  Atšaukti
                </Button>
                <Button type="submit" disabled={editFormDisabled}>
                  {updateMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saugoma…
                    </>
                  ) : (
                    'Išsaugoti'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!stepToDelete} onOpenChange={(open) => (!open ? setStepToDelete(null) : undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Patvirtinkite žingsnio šalinimą</AlertDialogTitle>
              <AlertDialogDescription>
                {stepToDelete ? `Ar tikrai norite ištrinti žingsnį „${stepToDelete.title}“?` : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isLoading}>Atšaukti</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isLoading}
                onClick={async () => {
                  if (!stepToDelete) return;
                  try {
                    await deleteMutation.mutateAsync(stepToDelete);
                    setStepToDelete(null);
                  } catch {
                    /* paliekame dialogą atidarytą */
                  }
                }}
              >
                Ištrinti
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TagManagerDialog
          open={isTagManagerOpen}
          onOpenChange={setIsTagManagerOpen}
          tags={tags}
          isLoading={tagsLoading}
          onCreate={tagManagerHandlers.onCreate}
          onUpdate={tagManagerHandlers.onUpdate}
          onDelete={tagManagerHandlers.onDelete}
        />
      </div>
    </MainLayout>
  );
}

function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: TagMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = options.filter((option) => value.includes(option.id));
  const buttonLabel = selected.length
    ? selected.map((option) => option.name).join(', ')
    : placeholder ?? 'Pasirinkite žymas';

  const toggleValue = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...value, id]);
    } else {
      onChange(value.filter((item) => item !== id));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="justify-between" disabled={disabled}>
          <span className="truncate">{buttonLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">Žymų nėra</p>
          ) : (
            options.map((option) => {
              const checked = value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox checked={checked} onCheckedChange={(state) => toggleValue(option.id, state === true)} />
                  <span className="flex-1 truncate">{option.name}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StepCard({
  step,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableActions,
  taskTitle,
}: StepCardProps) {
  const mediaTypeLabel = step.mediaType === 'image' ? 'Nuotrauka' : step.mediaType === 'video' ? 'Vaizdo įrašas' : '';

  return (
    <Card className="border-muted shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{step.title}</CardTitle>
            <Badge variant="outline">#{step.orderIndex}</Badge>
            {taskTitle ? <Badge variant="secondary">Užduotis: {taskTitle}</Badge> : null}
          </div>
          {step.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {step.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="bg-muted text-muted-foreground">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onMoveUp && onMoveDown ? (
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={onMoveUp} disabled={disableActions}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={onMoveDown} disabled={disableActions}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => onEdit(step)}
            disabled={disableActions}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 text-destructive"
            onClick={() => onDelete(step)}
            disabled={disableActions}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {step.contentText ? (
          <p className="whitespace-pre-line text-foreground">{step.contentText}</p>
        ) : (
          <p className="text-muted-foreground">Aprašymo nėra</p>
        )}
        {(step.mediaUrl || mediaTypeLabel || step.requireUserMedia) && (
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {step.mediaUrl ? (
              <a
                href={step.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Media
              </a>
            ) : null}
            {mediaTypeLabel ? <Badge variant="outline">{mediaTypeLabel}</Badge> : null}
            {step.requireUserMedia ? (
              <Badge variant="secondary">Reikia vartotojo nuotraukos/video</Badge>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TagManagerDialog({
  open,
  onOpenChange,
  tags,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [editorState, setEditorState] = useState<TagEditorState>({});
  const [processingTagId, setProcessingTagId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewTagName('');
      setEditorState({});
      setProcessingTagId(null);
      setIsCreating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEditorState((prev) => {
      const next: TagEditorState = {};
      tags.forEach((tag) => {
        next[tag.id] = prev[tag.id] ?? tag.name;
      });
      return next;
    });
  }, [open, tags]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) {
      toast.error('Įveskite žymės pavadinimą');
      return;
    }

    try {
      setIsCreating(true);
      await onCreate(trimmed);
      setNewTagName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editorState[id]?.trim();
    if (!name) {
      toast.error('Įveskite žymės pavadinimą');
      return;
    }

    try {
      setProcessingTagId(id);
      await onUpdate(id, name);
    } finally {
      setProcessingTagId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setProcessingTagId(id);
      await onDelete(id);
    } finally {
      setProcessingTagId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Žymų valdymas</DialogTitle>
          <DialogDescription>Kurti, pervadinti ar trinti žingsnių žymas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-md border border-dashed p-4">
          <Label htmlFor="new-tag-name">Nauja žyma</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="new-tag-name"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="Pvz., Pavasaris"
            />
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pridėti'}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Esamos žymos</h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : tags.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Žymų nėra
            </p>
          ) : (
            <div className="space-y-3">
              {tags.map((tag) => {
                const value = editorState[tag.id] ?? tag.name;
                const isProcessing = processingTagId === tag.id;
                return (
                  <div key={tag.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                    <Input
                      value={value}
                      onChange={(event) =>
                        setEditorState((prev) => ({ ...prev, [tag.id]: event.target.value }))
                      }
                      disabled={isProcessing}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUpdate(tag.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Išsaugoti'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDelete(tag.id)}
                        disabled={isProcessing}
                      >
                        Šalinti
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
