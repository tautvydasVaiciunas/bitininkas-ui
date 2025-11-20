import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Check, Edit, Loader2, Plus, Search, Trash2, X } from 'lucide-react';

import { MainLayout } from '@/components/Layout/MainLayout';
import { ResponsiveMedia } from '@/components/media/ResponsiveMedia';
import api, { HttpError } from '@/lib/api';
import {
  mapTaskStepFromApi,
  type CreateGlobalTaskStepPayload,
  type Tag,
  type TaskStep,
  type TaskStepMediaType,
  type UpdateTaskStepPayload,
} from '@/lib/types';
import { inferMediaType, resolveMediaUrl } from '@/lib/media';
import ltMessages from '@/i18n/messages.lt.json';

const messages = ltMessages.steps;
const tagMessages = ltMessages.tags;
const defaultValidationSummary =
  messages.validationSummary ??
  'Klaida: patikrinkite, ar pavadinimas ir aprašymas yra užpildyti, o media nuoroda teisinga.';

const MAX_IMAGE_UPLOAD_MB = 10;
const MAX_VIDEO_UPLOAD_MB = 30;
const formatUploadSizeLimitMessage = (mimeType: string) => {
  const limit = mimeType === 'video/mp4' ? MAX_VIDEO_UPLOAD_MB : MAX_IMAGE_UPLOAD_MB;
  return `Failas per didelis. Maksimalus dydis: ${limit} MB.`;
};

type StepMediaTypeOption = TaskStepMediaType | '';

const defaultCreateForm = () => ({
  title: '',
  description: '',
  mediaUrl: '',
  mediaType: '' as StepMediaTypeOption,
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

  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagDialogContext, setTagDialogContext] = useState<'create' | 'edit' | null>(null);

  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [createTagError, setCreateTagError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<StepFormState>(defaultCreateForm);
  const [editForm, setEditForm] = useState<StepEditFormState>({ ...defaultCreateForm(), orderIndex: '' });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [tagUpdatingId, setTagUpdatingId] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagMultiSelectOption | null>(null);

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

  const getHttpErrorDetails = (error: HttpError, fallback = defaultValidationSummary) => {
    const possibleDetails =
      error.data && typeof error.data === 'object'
        ? (error.data as { details?: unknown }).details
        : undefined;

    if (typeof possibleDetails === 'string' && possibleDetails.trim().length > 0) {
      return possibleDetails;
    }

    if (Array.isArray(possibleDetails)) {
      const joined = possibleDetails.filter((detail): detail is string => Boolean(detail)).join(' ');
      if (joined.trim().length > 0) {
        return joined;
      }
    }

    return fallback;
  };

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

  const stepsQueryKey = useMemo(() => ['steps', 'global', tagFilter || 'all'] as const, [tagFilter]);

  const {
    data: steps = [],
    isLoading: stepsLoading,
    isError: stepsError,
  } = useQuery<TaskStep[]>({
    queryKey: stepsQueryKey,
    queryFn: async () => {
      const response = await api.steps.listGlobal(tagFilter ? { tagId: tagFilter } : undefined);
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
      const matchesTags =
        step.tags?.some((tag) => tag.name.toLowerCase().includes(term)) ?? false;
      return matchesTitle || matchesContent || matchesTags;
    });
  }, [searchQuery, steps]);

  const invalidateStepQueries = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'steps',
    });
  };

  const resetCreateForm = () => {
    setCreateForm(defaultCreateForm());
    setIsUploadingCreateMedia(false);
    setCreateFormError(null);
  };

  const resetEditForm = () => {
    setEditForm({ ...defaultCreateForm(), orderIndex: '' });
    setIsUploadingEditMedia(false);
    setEditFormError(null);
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
      setCreateFormError(null);
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 400) {
        const details = getHttpErrorDetails(error, defaultValidationSummary);
        setCreateFormError(details);
        toast.error(details);
        return;
      }

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
      setEditFormError(null);
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 400) {
        const details = getHttpErrorDetails(error, defaultValidationSummary);
        setEditFormError(details);
        toast.error(details);
        return;
      }

      showError(error, messages.updateError);
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.tags.create({ name });
      return response;
    },
    onSuccess: (tag) => {
      toast.success(messages.tagCreateSuccess);
      setCreateTagError(null);
      setNewTagName('');
      setIsCreateTagOpen(false);
      const nextTagId = tag.id;

      if (tagDialogContext === 'create' && typeof nextTagId === 'string') {
        setCreateForm((prev) => ({
          ...prev,
          tagIds: Array.from(new Set([...prev.tagIds, nextTagId])),
        }));
      } else if (tagDialogContext === 'edit' && typeof nextTagId === 'string') {
        setEditForm((prev) => ({
          ...prev,
          tagIds: Array.from(new Set([...prev.tagIds, nextTagId])),
        }));
      }

      setTagDialogContext(null);

      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 400) {
        const details = getHttpErrorDetails(error, tagMessages.errorFallback);
        setCreateTagError(details);
        toast.error(details);
        return;
      }

      showError(error, messages.tagCreateError);
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      api.tags.update(id, { name }),
    onSuccess: () => {
      toast.success(tagMessages.updateSuccess);
      setEditingTagId(null);
      setEditingTagName('');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
    },
    onError: (error) => {
      showError(error, tagMessages.errorFallback);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => api.tags.remove(id),
    onSuccess: (_, id) => {
      toast.success(tagMessages.deleteSuccess);
      setTagToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      invalidateStepQueries();
      setCreateForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((tagId) => tagId !== id),
      }));
      setEditForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((tagId) => tagId !== id),
      }));
    },
    onError: (error) => {
      showError(error, tagMessages.errorFallback);
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

  const openCreateTagDialog = (context: 'create' | 'edit') => {
    setTagDialogContext(context);
    setCreateTagError(null);
    setNewTagName('');
    setIsCreateTagOpen(true);
  };

  const closeCreateTagDialog = () => {
    if (!createTagMutation.isLoading) {
      setIsCreateTagOpen(false);
      setTagDialogContext(null);
      setCreateTagError(null);
      setNewTagName('');
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationError);
      return;
    }

    const description = createForm.description.trim() ? createForm.description.trim() : null;

    const payload: CreateGlobalTaskStepPayload = {
      title: trimmedTitle,
      description,
      mediaUrl: createForm.mediaUrl.trim() ? createForm.mediaUrl.trim() : null,
      mediaType: createForm.mediaType || null,
      requireUserMedia: createForm.requireUserMedia,
      tagIds: createForm.tagIds,
    };

    setCreateFormError(null);
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

    const description = editForm.description.trim() ? editForm.description.trim() : null;

    const payload: UpdateTaskStepPayload = {
      title: trimmedTitle,
      description,
      mediaUrl: editForm.mediaUrl.trim() ? editForm.mediaUrl.trim() : null,
      mediaType: editForm.mediaType || null,
      requireUserMedia: editForm.requireUserMedia,
      tagIds: editForm.tagIds,
      orderIndex,
    };

    setEditFormError(null);
    await updateMutation.mutateAsync({ id: stepToEdit.id, data: payload });
  };

  const handleCreateTagSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newTagName.trim();

    if (!trimmedName) {
      setCreateTagError(messages.tagCreateValidationError);
      toast.error(messages.tagCreateValidationError);
      return;
    }

    await createTagMutation.mutateAsync(trimmedName);
  };

  const handleCreateMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mimeType = file.type;
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
      if (error instanceof HttpError && error.message === 'Failas per didelis') {
        toast.error(formatUploadSizeLimitMessage(mimeType));
      } else {
        toast.error(messages.uploadError);
      }
    } finally {
      setIsUploadingCreateMedia(false);
      event.target.value = '';
    }
  };

  const handleEditMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mimeType = file.type;
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
      if (error instanceof HttpError && error.message === 'Failas per didelis') {
        toast.error(formatUploadSizeLimitMessage(mimeType));
      } else {
        toast.error(messages.uploadError);
      }
    } finally {
      setIsUploadingEditMedia(false);
      event.target.value = '';
    }
  };

  const startTagEdit = (tag: TagMultiSelectOption) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const cancelTagEdit = () => {
    setEditingTagId(null);
    setEditingTagName('');
  };

  const finalizeTagEdit = async () => {
    if (!editingTagId) {
      return;
    }

    const trimmedName = editingTagName.trim();
    if (!trimmedName) {
      toast.error(tagMessages.errorFallback);
      return;
    }

    const currentTag = tags.find((tag) => tag.id === editingTagId);
    if (!currentTag) {
      cancelTagEdit();
      return;
    }

    if (currentTag.name === trimmedName) {
      cancelTagEdit();
      return;
    }

    setTagUpdatingId(editingTagId);
    try {
      await updateTagMutation.mutateAsync({ id: editingTagId, name: trimmedName });
    } finally {
      setTagUpdatingId(null);
    }
  };

  const confirmTagDelete = async () => {
    if (!tagToDelete) {
      return;
    }

    try {
      await deleteTagMutation.mutateAsync(tagToDelete.id);
    } finally {
      setTagToDelete(null);
    }
  };

  const openEditDialog = (step: TaskStep) => {
    setStepToEdit(step);
    setEditForm({
      title: step.title,
      description: step.contentText ?? '',
      mediaUrl: step.mediaUrl ?? '',
      mediaType: step.mediaType ?? '',
      requireUserMedia: step.requireUserMedia ?? false,
      tagIds:
        step.tags?.map((tag) => tag.id).filter((id): id is string => typeof id === 'string' && id.length > 0) ?? [],
      orderIndex: step.orderIndex ? String(step.orderIndex) : '',
    });
    setEditFormError(null);
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
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Administravimas</p>
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
                  placeholder="Ieškoti pagal pavadinimą ar žymas"
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
              {createFormError ? (
                <Alert variant="destructive">
                  <AlertTitle>Klaida</AlertTitle>
                  <AlertDescription>{createFormError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  <Label htmlFor="create-step-media-url">Media (nuotrauka / video)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="create-step-media-url"
                      value={createForm.mediaUrl}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                      placeholder="Įklijuokite media URL"
                      disabled={createFormDisabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => createFileInputRef.current?.click()}
                      disabled={createFormDisabled}
                    >
                      {isUploadingCreateMedia ? 'Įkeliamaa¦' : 'Įkelti failą'}
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
                    value={createForm.mediaType || ''}
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
                    onCreateTag={() => openCreateTagDialog('create')}
                    creatingTag={createTagMutation.isLoading && tagDialogContext === 'create'}
                    editingTagId={editingTagId}
                    editingTagName={editingTagName}
                    onStartEditTag={startTagEdit}
                    onEditTagNameChange={(value) => setEditingTagName(value)}
                    onConfirmEditTag={finalizeTagEdit}
                    onCancelEditTag={cancelTagEdit}
                    tagUpdatingId={tagUpdatingId}
                    onDeleteTag={(option) => setTagToDelete(option)}
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
                      Saugomaa¦
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
                {stepToEdit ? `Atnaujinkite žingsnį a?${stepToEdit.title}a?.` : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editFormError ? (
                <Alert variant="destructive">
                  <AlertTitle>Klaida</AlertTitle>
                  <AlertDescription>{editFormError}</AlertDescription>
                </Alert>
              ) : null}
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
                  <Label htmlFor="edit-step-media-url">Media (nuotrauka / video)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="edit-step-media-url"
                      value={editForm.mediaUrl}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                      placeholder="Įklijuokite media URL"
                      disabled={editFormDisabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editFormDisabled}
                    >
                      {isUploadingEditMedia ? 'Įkeliamaa¦' : 'Įkelti failą'}
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
                    value={editForm.mediaType || ''}
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
                    onCreateTag={() => openCreateTagDialog('edit')}
                    creatingTag={createTagMutation.isLoading && tagDialogContext === 'edit'}
                    editingTagId={editingTagId}
                    editingTagName={editingTagName}
                    onStartEditTag={startTagEdit}
                    onEditTagNameChange={(value) => setEditingTagName(value)}
                    onConfirmEditTag={finalizeTagEdit}
                    onCancelEditTag={cancelTagEdit}
                    tagUpdatingId={tagUpdatingId}
                    onDeleteTag={(option) => setTagToDelete(option)}
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
                      Saugomaa¦
                    </>
                  ) : (
                    'Saugoti'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateTagOpen} onOpenChange={(open) => (open ? setIsCreateTagOpen(true) : closeCreateTagDialog())}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nauja žyma</DialogTitle>
              <DialogDescription>Įveskite žymos pavadinimą.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTagSubmit} className="space-y-4">
              {createTagError ? (
                <Alert variant="destructive">
                  <AlertTitle>Klaida</AlertTitle>
                  <AlertDescription>{createTagError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="new-tag-name">Pavadinimas</Label>
                <Input
                  id="new-tag-name"
                  value={newTagName}
                  onChange={(event) => {
                    setNewTagName(event.target.value);
                    if (createTagError) {
                      setCreateTagError(null);
                    }
                  }}
                  disabled={createTagMutation.isLoading}
                  placeholder="Pvz., Pavasaris"
                  autoFocus
                />
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeCreateTagDialog} disabled={createTagMutation.isLoading}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={createTagMutation.isLoading}>
                  {createTagMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saugomaa¦
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
                {stepToDelete ? `Ar tikrai norite ištrinti žingsnį a?${stepToDelete.title}a??` : ''}
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
        <AlertDialog
          open={Boolean(tagToDelete)}
          onOpenChange={(open) => (!open ? setTagToDelete(null) : undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ištrinti žymą</AlertDialogTitle>
              <AlertDialogDescription>
                Ar tikrai norite ištrinti šią žymą? Ji bus pašalinta iš visų žingsnių.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteTagMutation.isLoading}>Atšaukti</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteTagMutation.isLoading}
                onClick={confirmTagDelete}
              >
                Ištrinti žymą
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
  onCreateTag?: () => void;
  creatingTag?: boolean;
  editingTagId?: string | null;
  editingTagName?: string;
  onStartEditTag?: (option: TagMultiSelectOption) => void;
  onEditTagNameChange?: (next: string) => void;
  onConfirmEditTag?: () => void;
  onCancelEditTag?: () => void;
  tagUpdatingId?: string | null;
  onDeleteTag?: (option: TagMultiSelectOption) => void;
};

function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  onCreateTag,
  creatingTag,
  editingTagId,
  editingTagName,
  onStartEditTag,
  onEditTagNameChange,
  onConfirmEditTag,
  onCancelEditTag,
  tagUpdatingId,
  onDeleteTag,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (id: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
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
    <Popover open={open} onOpenChange={setOpen}>
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
              const isEditing = editingTagId === option.id;
              const isUpdating = tagUpdatingId === option.id;
              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                >
                  <label
                    className="flex flex-1 cursor-pointer items-center gap-2"
                    onClick={(event) => {
                      if (isEditing) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(state) => toggleValue(option.id, state === true)}
                      disabled={Boolean(disabled) || isEditing || isUpdating}
                    />
                    {isEditing ? (
                      <Input
                        className="flex-1"
                        value={editingTagName ?? option.name}
                        onChange={(event) => onEditTagNameChange?.(event.target.value)}
                        disabled={isUpdating}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            onConfirmEditTag?.();
                          }
                          if (event.key === 'Escape') {
                            onCancelEditTag?.();
                          }
                        }}
                      />
                    ) : (
                      <span className="flex-1 truncate">{option.name}</span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onConfirmEditTag?.();
                          }}
                          disabled={isUpdating}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCancelEditTag?.();
                          }}
                          disabled={isUpdating}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onStartEditTag?.(option);
                          }}
                          disabled={Boolean(tagUpdatingId)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpen(false);
                            onDeleteTag?.(option);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {onCreateTag ? (
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                onCreateTag();
              }}
              disabled={disabled || creatingTag}
            >
              {creatingTag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Sukurti naują žymą
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

type StepCardProps = {
  step: TaskStep;
  onEdit: () => void;
  onDelete: () => void;
  disableActions?: boolean;
};

function StepCard({ step, onEdit, onDelete, disableActions }: StepCardProps) {
  const resolvedMediaUrl = resolveMediaUrl(step.mediaUrl);
  const mediaKind = step.mediaType ?? inferMediaType(null, resolvedMediaUrl);
  const mediaLabel = mediaKind === 'image' ? 'Nuotrauka' : mediaKind === 'video' ? 'Vaizdo įrašas' : null;
  const visibleTags = (step.tags ?? []).filter(
    (tag): tag is NonNullable<TaskStep['tags']>[number] & { id: string } =>
      Boolean(tag) && typeof tag.id === 'string' && tag.id.length > 0,
  );
  const shouldShowMediaMeta = Boolean(resolvedMediaUrl || mediaLabel || step.requireUserMedia);
  const [videoError, setVideoError] = useState(false);

  return (
    <Card className="border-muted shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{step.title}</CardTitle>
            {typeof step.orderIndex === 'number' ? <Badge variant="outline">#{step.orderIndex}</Badge> : null}
          </div>
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
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
        {resolvedMediaUrl ? (
          <ResponsiveMedia
            url={resolvedMediaUrl}
            type={mediaKind ?? undefined}
            title={step.title}
            className="w-full max-w-3xl"
          />
        ) : null}
        {shouldShowMediaMeta ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {mediaLabel ? <Badge variant="outline">{mediaLabel}</Badge> : null}
            {step.requireUserMedia ? (
              <Badge variant="secondary">Reikia vartotojo nuotraukos ar vaizdo įrašo</Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


