import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';

import { MainLayout } from '@/components/Layout/MainLayout';
import api, { HttpError } from '@/lib/api';
import {
  mapTaskFromApi,
  mapTaskStepFromApi,
  type CreateGlobalTaskStepPayload,
  type Tag,
  type Task,
  type TaskStep,
  type TaskStepMediaType,
  type UpdateTaskStepPayload,
} from '@/lib/types';
import ltMessages from '@/i18n/messages.lt.json';

const messages = ltMessages.steps;

const defaultCreateForm = () => ({
  taskId: '',
  title: '',
  description: '',
  mediaUrl: '',
  mediaType: undefined as TaskStepMediaType | undefined,
  requireUserMedia: false,
  tagIds: [] as string[],
});

type StepFormState = ReturnType<typeof defaultCreateForm>;

type StepEditFormState = StepFormState & { orderIndex: string };

type TagMultiSelectOption = {
  id: string;
  name: string;
};

export default function AdminSteps() {
  const queryClient = useQueryClient();

  const [tagFilter, setTagFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [stepToEdit, setStepToEdit] = useState<TaskStep | null>(null);
  const [stepToDelete, setStepToDelete] = useState<TaskStep | null>(null);

  const [createForm, setCreateForm] = useState<StepFormState>(defaultCreateForm);
  const [editForm, setEditForm] = useState<StepEditFormState>({ ...defaultCreateForm(), orderIndex: '' });

  const [isUploadingCreateMedia, setIsUploadingCreateMedia] = useState(false);
  const [isUploadingEditMedia, setIsUploadingEditMedia] = useState(false);

  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const showError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      toast.error(error.message);
      return;
    }

    toast.error(fallback);
  };

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'for-step-management'],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const availableTasks = useMemo(
    () => tasks.filter((task) => typeof task.id === 'string' && task.id.length > 0),
    [tasks],
  );

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    if (!createForm.taskId && availableTasks.length > 0) {
      setCreateForm((prev) => ({ ...prev, taskId: availableTasks[0]!.id }));
    }
  }, [availableTasks, createForm.taskId, isCreateOpen]);

  const taskTitleMap = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title] as const)),
    [tasks],
  );

  const { data: tags = [], isLoading: tagsLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
  });

  const tagOptions: TagMultiSelectOption[] = useMemo(
    () =>
      tags
        .filter((tag) => typeof tag.id === 'string' && tag.id.length > 0)
        .map((tag) => ({ id: tag.id, name: tag.name })),
    [tags],
  );

  const tagFilterSelectValue = tagFilter === '' ? 'all' : tagFilter;

  const stepsQueryKey = useMemo(() => ['steps', tagFilter || 'all'] as const, [tagFilter]);

  const {
    data: steps = [],
    isLoading: stepsLoading,
    isError: stepsError,
  } = useQuery<TaskStep[]>({
    queryKey: stepsQueryKey,
    queryFn: async () => {
      const response = await api.steps.list(tagFilter ? { tagId: tagFilter } : undefined);
      return response.map(mapTaskStepFromApi);
    },
  });

  const filteredSteps = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return steps;
    }

    return steps.filter((step) => {
      const matchesTitle = step.title.toLowerCase().includes(term);
      const matchesContent = step.contentText?.toLowerCase().includes(term) ?? false;
      const matchesTask = taskTitleMap.get(step.taskId)?.toLowerCase().includes(term) ?? false;
      return matchesTitle || matchesContent || matchesTask;
    });
  }, [searchQuery, steps, taskTitleMap]);

  const invalidateStepQueries = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'steps',
    });
  };

  const resetCreateForm = () => {
    setCreateForm(defaultCreateForm());
    setIsUploadingCreateMedia(false);
  };

  const resetEditForm = () => {
    setEditForm({ ...defaultCreateForm(), orderIndex: '' });
    setIsUploadingEditMedia(false);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateGlobalTaskStepPayload) => {
      const response = await api.steps.create(payload);
      return mapTaskStepFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.createSuccess);
      setIsCreateOpen(false);
      resetCreateForm();
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, messages.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskStepPayload }) => {
      const response = await api.steps.update(id, data);
      return mapTaskStepFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      setIsEditOpen(false);
      setStepToEdit(null);
      resetEditForm();
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, messages.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.steps.remove(id),
    onSuccess: () => {
      toast.success(messages.deleteSuccess);
      setStepToDelete(null);
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, messages.deleteError);
    },
  });

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = createForm.title.trim();
    const selectedTaskId = createForm.taskId.trim();

    if (!trimmedTitle || !selectedTaskId) {
      toast.error(messages.validationError);
      return;
    }

    const payload: CreateGlobalTaskStepPayload = {
      taskId: selectedTaskId,
      title: trimmedTitle,
      contentText: createForm.description.trim() ? createForm.description.trim() : null,
      mediaUrl: createForm.mediaUrl.trim() ? createForm.mediaUrl.trim() : null,
      mediaType: createForm.mediaType || null,
      requireUserMedia: createForm.requireUserMedia,
      tagIds: createForm.tagIds,
    };

    await createMutation.mutateAsync(payload);
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

    let orderIndex: number | undefined;
    if (editForm.orderIndex.trim()) {
      const parsed = Number(editForm.orderIndex);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error(messages.orderIndexInvalid);
        return;
      }
      orderIndex = parsed;
    }

    const payload: UpdateTaskStepPayload = {
      title: trimmedTitle,
      contentText: editForm.description.trim() ? editForm.description.trim() : null,
      mediaUrl: editForm.mediaUrl.trim() ? editForm.mediaUrl.trim() : null,
      mediaType: editForm.mediaType || null,
      requireUserMedia: editForm.requireUserMedia,
      tagIds: editForm.tagIds,
      orderIndex,
    };

    await updateMutation.mutateAsync({ id: stepToEdit.id, data: payload });
  };

  const handleCreateMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCreateMedia(true);
    try {
      const response = await api.media.upload(file);
      setCreateForm((prev) => ({
        ...prev,
        mediaUrl: response.url,
        mediaType: prev.mediaType || (file.type === 'video/mp4' ? 'video' : 'image'),
      }));
      toast.success(messages.uploadSuccess);
    } catch (error) {
      console.error('Failed to upload media', error);
      toast.error(messages.uploadError);
    } finally {
      setIsUploadingCreateMedia(false);
      event.target.value = '';
    }
  };

  const handleEditMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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

  const openEditDialog = (step: TaskStep) => {
    setStepToEdit(step);
    setEditForm({
      taskId: step.taskId,
      title: step.title,
      description: step.contentText ?? '',
      mediaUrl: step.mediaUrl ?? '',
      mediaType: step.mediaType ?? undefined,
      requireUserMedia: step.requireUserMedia ?? false,
      tagIds:
        step.tags?.map((tag) => tag.id).filter((id): id is string => typeof id === 'string' && id.length > 0) ?? [],
      orderIndex: step.orderIndex ? String(step.orderIndex) : '',
    });
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
    setStepToEdit(null);
    resetEditForm();
  };

  const createFormDisabled = createMutation.isLoading || isUploadingCreateMedia;
  const editFormDisabled = updateMutation.isLoading || isUploadingEditMedia;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Vienas visų žingsnių sąrašas</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Naujas žingsnis
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-filter">Filtruoti pagal žymą</Label>
              <Select
                value={tagFilterSelectValue}
                onValueChange={(value) => setTagFilter(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="tag-filter">
                  <SelectValue placeholder="Pasirinkite žymą" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visos žymos</SelectItem>
                  {tagOptions.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-steps">Paieška</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-steps"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Ieškoti pagal pavadinimą ar užduotį"
                  className="pl-9"
                />
              </div>
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
                    taskTitle={taskTitleMap.get(step.taskId)}
                    onEdit={() => openEditDialog(step)}
                    onDelete={() => setStepToDelete(step)}
                    disableActions={deleteMutation.isLoading || updateMutation.isLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            if (open) {
              setIsCreateOpen(true);
            } else {
              setIsCreateOpen(false);
              resetCreateForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Naujas žingsnis</DialogTitle>
              <DialogDescription>Užpildykite informaciją apie naują žingsnį.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-step-task">Užduotis</Label>
                  <Select
                    value={createForm.taskId || undefined}
                    onValueChange={(value) => setCreateForm((prev) => ({ ...prev, taskId: value }))}
                    disabled={createFormDisabled || tasksLoading}
                  >
                    <SelectTrigger id="create-step-task">
                      <SelectValue placeholder={tasksLoading ? 'Kraunama…' : 'Pasirinkite užduotį'} />
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="create-step-title">Pavadinimas</Label>
                  <Input
                    id="create-step-title"
                    value={createForm.title}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                    disabled={createFormDisabled}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="create-step-description">Aprašymas</Label>
                  <Textarea
                    id="create-step-description"
                    value={createForm.description}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
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
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                      placeholder="https://…"
                      disabled={createFormDisabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => createFileInputRef.current?.click()}
                      disabled={createFormDisabled}
                    >
                      {isUploadingCreateMedia ? 'Įkeliama…' : 'Įkelti failą'}
                    </Button>
                    <input
                      ref={createFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,video/mp4"
                      onChange={handleCreateMediaUpload}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-step-media-type">Media tipas</Label>
                  <Select
                    value={createForm.mediaType || undefined}
                    onValueChange={(value: TaskStepMediaType) =>
                      setCreateForm((prev) => ({ ...prev, mediaType: value }))
                    }
                    disabled={createFormDisabled}
                  >
                    <SelectTrigger id="create-step-media-type">
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
                <div className="flex items-center gap-2 md:col-span-2">
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
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
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

        <Dialog open={isEditOpen} onOpenChange={(open) => (open ? setIsEditOpen(true) : closeEditDialog())}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redaguoti žingsnį</DialogTitle>
              <DialogDescription>
                {stepToEdit ? `Atnaujinkite žingsnį „${stepToEdit.title}“.` : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Užduotis</Label>
                  <Input value={taskTitleMap.get(stepToEdit?.taskId ?? '') ?? '—'} disabled />
                </div>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-step-description">Aprašymas</Label>
                  <Textarea
                    id="edit-step-description"
                    value={editForm.description}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editFormDisabled}
                    >
                      {isUploadingEditMedia ? 'Įkeliama…' : 'Įkelti failą'}
                    </Button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,video/mp4"
                      onChange={handleEditMediaUpload}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-step-media-type">Media tipas</Label>
                  <Select
                    value={editForm.mediaType || undefined}
                    onValueChange={(value: TaskStepMediaType) =>
                      setEditForm((prev) => ({ ...prev, mediaType: value }))
                    }
                    disabled={editFormDisabled}
                  >
                    <SelectTrigger id="edit-step-media-type">
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
                    value={editForm.orderIndex}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, orderIndex: event.target.value }))}
                    disabled={editFormDisabled}
                    placeholder="Palikite tuščią, jei nekeičiate"
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeEditDialog} disabled={editFormDisabled}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={editFormDisabled}>
                  {updateMutation.isLoading ? (
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

        <AlertDialog open={Boolean(stepToDelete)} onOpenChange={(open) => (!open ? setStepToDelete(null) : undefined)}>
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
                  } catch {
                    /* paliekame dialogą atidarytą jei nepavyko */
                  }
                }}
              >
                Ištrinti
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

type TagMultiSelectProps = {
  options: TagMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

function TagMultiSelect({ options, value, onChange, placeholder, disabled }: TagMultiSelectProps) {
  const toggleValue = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...value, id]);
    } else {
      onChange(value.filter((item) => item !== id));
    }
  };

  const label = value.length
    ? options
        .filter((option) => value.includes(option.id))
        .map((option) => option.name)
        .join(', ')
    : placeholder ?? 'Pasirinkite žymas';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="justify-between" disabled={disabled}>
          <span className="truncate">{label}</span>
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

type StepCardProps = {
  step: TaskStep;
  taskTitle?: string;
  onEdit: () => void;
  onDelete: () => void;
  disableActions?: boolean;
};

function StepCard({ step, taskTitle, onEdit, onDelete, disableActions }: StepCardProps) {
  const mediaLabel = step.mediaType === 'image' ? 'Nuotrauka' : step.mediaType === 'video' ? 'Vaizdo įrašas' : null;

  return (
    <Card className="border-muted shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{step.title}</CardTitle>
            {typeof step.orderIndex === 'number' ? <Badge variant="outline">#{step.orderIndex}</Badge> : null}
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
          <Button size="icon" variant="outline" onClick={onEdit} disabled={disableActions}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-destructive"
            onClick={onDelete}
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
        {(step.mediaUrl || mediaLabel || step.requireUserMedia) && (
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
            {mediaLabel ? <Badge variant="outline">{mediaLabel}</Badge> : null}
            {step.requireUserMedia ? <Badge variant="secondary">Reikia vartotojo nuotraukos/video</Badge> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
