import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
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
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const buildDefaultCreateForm = () => ({
    title: '',
    description: '',
    content: '',
    mediaUrl: '',
  });
  const [createForm, setCreateForm] = useState(buildDefaultCreateForm);
  const [createMediaType, setCreateMediaType] = useState<TaskStepMediaType | ''>('');
  const [createRequireUserMedia, setCreateRequireUserMedia] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCreateMedia, setIsUploadingCreateMedia] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [stepToEdit, setStepToEdit] = useState<TaskStep | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    contentText: '',
    mediaUrl: '',
    mediaType: '' as TaskStepMediaType | '',
    requireUserMedia: false,
    orderIndex: '',
  });
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingEditMedia, setIsUploadingEditMedia] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<TaskStep | null>(null);
  const queryClient = useQueryClient();

  const resetCreateForm = () => {
    setCreateForm(buildDefaultCreateForm());
    setCreateMediaType('');
    setCreateRequireUserMedia(false);
  };

  const resetEditForm = () => {
    setEditForm({
      title: '',
      contentText: '',
      mediaUrl: '',
      mediaType: '' as TaskStepMediaType | '',
      requireUserMedia: false,
      orderIndex: '',
    });
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setStepToEdit(null);
    resetEditForm();
    setIsUploadingEditMedia(false);
  };

  const openEditDialog = (step: TaskStep) => {
    setStepToEdit(step);
    setEditForm({
      title: step.title,
      contentText: step.contentText ?? '',
      mediaUrl: step.mediaUrl ?? '',
      mediaType: step.mediaType ?? '',
      requireUserMedia: step.requireUserMedia ?? false,
      orderIndex: String(step.orderIndex ?? ''),
    });
    setIsEditDialogOpen(true);
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

  const invalidateSteps = () => {
    if (!selectedTaskId) return;
    void queryClient.invalidateQueries({ queryKey: stepsQueryKey });
    void queryClient.invalidateQueries({
      queryKey: ['tasks', selectedTaskId, 'steps', 'for-template'],
    });
    void queryClient.invalidateQueries({ queryKey: ['templates'] });
  };

  const showError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      toast.error(error.message);
      return;
    }
    toast.error(fallback);
  };
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
    mutationFn: async (payload: CreateTaskStepPayload) => {
      const response = await api.tasks.createStep(selectedTaskId!, payload);
      return mapTaskStepFromApi(response);
    },
    onSuccess: (createdStep) => {
      toast.success(messages.createSuccess);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      queryClient.setQueryData<TaskStep[]>(stepsQueryKey, (current = []) => {
        const withoutDuplicate = current.filter((step) => step.id !== createdStep.id);
        return [...withoutDuplicate, createdStep].sort((a, b) => a.orderIndex - b.orderIndex);
      });
      invalidateSteps();
    },
    onError: (error) => {
      showError(error, messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ stepId, payload }: { stepId: string; payload: UpdateTaskStepPayload }) => {
      const response = await api.tasks.updateStep(selectedTaskId!, stepId, payload);
      return mapTaskStepFromApi(response);
    },
    onSuccess: (updatedStep) => {
      toast.success(messages.updateSuccess);
      closeEditDialog();
      queryClient.setQueryData<TaskStep[]>(stepsQueryKey, (current = []) => {
        const updated = current.map((step) => (step.id === updatedStep.id ? updatedStep : step));
        return updated.sort((a, b) => a.orderIndex - b.orderIndex);
      });
      invalidateSteps();
    },
    onError: (error) => {
      showError(error, messages.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      await api.tasks.deleteStep(selectedTaskId!, stepId);
      return stepId;
    },
    onSuccess: (deletedStepId) => {
      toast.success(messages.deleteSuccess);
      queryClient.setQueryData<TaskStep[]>(stepsQueryKey, (current = []) =>
        current.filter((step) => step.id !== deletedStepId),
      );
      invalidateSteps();
    },
    onError: (error) => {
      showError(error, messages.deleteError);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { stepId: string; orderIndex: number }[]) => {
      const response = await api.tasks.reorderSteps(selectedTaskId!, { steps: payload });
      return response.map(mapTaskStepFromApi);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: stepsQueryKey });
      const previousSteps = queryClient.getQueryData<TaskStep[]>(stepsQueryKey) ?? [];

      const orderMap = new Map(payload.map((item) => [item.stepId, item.orderIndex]));
      const updated = previousSteps
        .map((step) =>
          orderMap.has(step.id)
            ? { ...step, orderIndex: orderMap.get(step.id)! }
            : step,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

      queryClient.setQueryData<TaskStep[]>(stepsQueryKey, updated);

      return { previousSteps };
    },
    onSuccess: (reordered) => {
      toast.success(messages.reorderSuccess);
      queryClient.setQueryData<TaskStep[]>(stepsQueryKey, () =>
        [...reordered].sort((a, b) => a.orderIndex - b.orderIndex),
      );
      invalidateSteps();
    },
    onError: (error, _variables, context) => {
      if (context?.previousSteps) {
        queryClient.setQueryData<TaskStep[]>(stepsQueryKey, context.previousSteps);
      }
      showError(error, messages.reorderError);
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

    const description = createForm.description.trim();
    const content = createForm.content.trim();
    const mediaUrlValue = createForm.mediaUrl.trim();

    const payload: CreateTaskStepPayload = {
      title: trimmedTitle,
      contentText: content || description || undefined,
      requireUserMedia: createRequireUserMedia,
    };

    if (mediaUrlValue) {
      payload.mediaUrl = mediaUrlValue;
    }

    if (createMediaType) {
      payload.mediaType = createMediaType;
    }

    await createMutation.mutateAsync(payload);
  };

  const handleCreateMediaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCreateMedia(true);
    try {
      const response = await api.media.upload(file);
      setCreateForm((prev) => ({ ...prev, mediaUrl: response.url }));

      if (!createMediaType) {
        setCreateMediaType(file.type === 'video/mp4' ? 'video' : 'image');
      }

      toast.success('Failas įkeltas');
    } catch (error) {
      console.error('Failed to upload media', error);
      toast.error('Nepavyko įkelti failo');
    } finally {
      setIsUploadingCreateMedia(false);
      event.target.value = '';
    }
  };

  const openCreateMediaFileDialog = () => {
    createFileInputRef.current?.click();
  };

  const handleEditMediaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingEditMedia(true);
    try {
      const response = await api.media.upload(file);
      setEditForm((prev) => {
        const nextMediaType = prev.mediaType || (file.type === 'video/mp4' ? 'video' : 'image');
        return {
          ...prev,
          mediaUrl: response.url,
          mediaType: prev.mediaType || nextMediaType,
        };
      });
      toast.success('Failas įkeltas');
    } catch (error) {
      console.error('Failed to upload media', error);
      toast.error('Nepavyko įkelti failo');
    } finally {
      setIsUploadingEditMedia(false);
      event.target.value = '';
    }
  };

  const openEditMediaFileDialog = () => {
    editFileInputRef.current?.click();
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

  const disableStepActions =
    deleteMutation.isLoading ||
    reorderMutation.isLoading ||
    updateMutation.isLoading ||
    createMutation.isLoading;

  const createFormDisabled = createMutation.isLoading || isUploadingCreateMedia;
  const editFormDisabled = updateMutation.isLoading || isUploadingEditMedia;

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTaskId || !stepToEdit) {
      return;
    }

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationError);
      return;
    }

    const parsedOrderIndex = Number(editForm.orderIndex);
    if (!Number.isFinite(parsedOrderIndex) || parsedOrderIndex <= 0) {
      toast.error('Įveskite teisingą žingsnio eiliškumą');
      return;
    }

    const payload: UpdateTaskStepPayload = {
      title: trimmedTitle,
      contentText: editForm.contentText.trim() ? editForm.contentText.trim() : null,
      mediaUrl: editForm.mediaUrl.trim() ? editForm.mediaUrl.trim() : null,
      mediaType: editForm.mediaType || null,
      requireUserMedia: editForm.requireUserMedia,
      orderIndex: parsedOrderIndex,
    };

    await updateMutation.mutateAsync({ stepId: stepToEdit.id, payload });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių žingsnius</p>
          </div>
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
              <Button disabled={!selectedTaskId || createFormDisabled}>
                {createMutation.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 w-4 h-4" />
                )}
                {createMutation.isLoading ? 'Sukuriama...' : 'Pridėti žingsnį'}
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
                        placeholder="https://..."
                        disabled={createFormDisabled}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={openCreateMediaFileDialog}
                          disabled={createFormDisabled}
                        >
                          {isUploadingCreateMedia ? 'Įkeliama...' : 'Įkelti failą'}
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
                      value={createMediaType || undefined}
                      onValueChange={(value: TaskStepMediaType) => setCreateMediaType(value)}
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
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Checkbox
                      id="create-require-media"
                      checked={createRequireUserMedia}
                      onCheckedChange={(checked) => setCreateRequireUserMedia(checked === true)}
                      disabled={createFormDisabled}
                    />
                    <Label htmlFor="create-require-media" className="cursor-pointer">
                      Reikia vartotojo nuotraukos
                    </Label>
                  </div>
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetCreateForm();
                      setIsCreateDialogOpen(false);
                    }}
                    disabled={createFormDisabled}
                  >
                    Atšaukti
                  </Button>
                  <Button type="submit" disabled={createFormDisabled}>
                    {createMutation.isLoading ? (
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti žingsnių..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTaskId ? (
              <div className="py-12 text-center text-muted-foreground">Pirmiausia pasirinkite užduotį</div>
            ) : isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Kraunama...</div>
            ) : isError ? (
              <div className="py-12 text-center text-destructive">Nepavyko įkelti žingsnių.</div>
            ) : filteredSteps.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Šiai užduočiai žingsnių dar nėra</div>
            ) : (
              <div className="space-y-4">
                {filteredSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    onEdit={openEditDialog}
                    onDelete={(target) => setStepToDelete(target)}
                    disableActions={disableStepActions}
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

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeEditDialog();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redaguoti žingsnį</DialogTitle>
              <DialogDescription>
                {stepToEdit
                  ? `Atnaujinkite žingsnio „${stepToEdit.title}“ informaciją.`
                  : 'Atnaujinkite žingsnio informaciją.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-step-title">Pavadinimas</Label>
                  <Input
                    id="edit-step-title"
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    disabled={editFormDisabled}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-step-content">Turinys</Label>
                  <Textarea
                    id="edit-step-content"
                    value={editForm.contentText}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, contentText: event.target.value }))
                    }
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
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, mediaUrl: event.target.value }))
                      }
                      placeholder="https://..."
                      disabled={editFormDisabled}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openEditMediaFileDialog}
                        disabled={editFormDisabled}
                      >
                        {isUploadingEditMedia ? 'Įkeliama...' : 'Įkelti failą'}
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-require-media"
                    checked={editForm.requireUserMedia}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({ ...prev, requireUserMedia: checked === true }))
                    }
                    disabled={editFormDisabled}
                  />
                  <Label htmlFor="edit-require-media" className="cursor-pointer">
                    Reikia vartotojo nuotraukos
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
                      Saugoma...
                    </>
                  ) : (
                    'Išsaugoti'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!stepToDelete}
          onOpenChange={(open) => {
            if (!open) {
              setStepToDelete(null);
            }
          }}
        >
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
                    await deleteMutation.mutateAsync(stepToDelete.id);
                    setStepToDelete(null);
                  } catch {
                    /* paliekame dialogą atidarytą */
                  }
                }}
              >
                {deleteMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Šalinama...
                  </>
                ) : (
                  'Ištrinti'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

interface StepCardProps {
  step: TaskStep;
  onEdit: (step: TaskStep) => void;
  onDelete: (step: TaskStep) => void;
  disableActions: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepCard({
  step,
  onEdit,
  onDelete,
  disableActions,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: StepCardProps) {
  const mediaTypeLabel =
    step.mediaType === 'image'
      ? 'Nuotrauka'
      : step.mediaType === 'video'
      ? 'Vaizdo įrašas'
      : null;

  return (
    <Card className="shadow-custom">
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <Badge variant="outline">#{step.orderIndex}</Badge>
            </div>
            {step.contentText && (
              <p className="text-sm text-foreground whitespace-pre-line">{step.contentText}</p>
            )}
            {(step.mediaUrl || mediaTypeLabel || step.requireUserMedia) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(step)}
                disabled={disableActions}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(step)}
                disabled={disableActions}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

