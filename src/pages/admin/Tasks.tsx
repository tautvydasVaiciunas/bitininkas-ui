import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Search, Star } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveMedia } from '@/components/media/ResponsiveMedia';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapTemplateFromApi,
  mapTaskFromApi,
  type AssignmentDetails,
  type AssignmentReviewQueueItem,
  type AssignmentReviewQueueResponse,
  type AssignmentReviewStatus,
  type SubmitAssignmentReviewPayload,
  type Task,
  type Template,
  type UpdateTaskPayload,
} from '@/lib/types';

const messages = ltMessages.tasks;

const reviewStatusOptions: { value: AssignmentReviewStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Laukia patikrinimo' },
  { value: 'approved', label: 'Patvirtintos' },
  { value: 'rejected', label: 'Neįvertintos' },
  { value: 'all', label: 'Visos' },
];

const formatShortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('lt-LT') : '—';

const renderRatingStars = (rating: number | null | undefined) =>
  Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${rating && rating > index ? 'text-amber-500' : 'text-muted-foreground'}`}
    />
  ));

const getErrorMessage = (error: unknown) => {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Įvyko nenumatyta klaida';
};

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
  const [activeTab, setActiveTab] = useState<'review' | 'created'>('review');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<AssignmentReviewStatus | 'all'>(
    'pending',
  );
  const [selectedReviewAssignment, setSelectedReviewAssignment] =
    useState<AssignmentReviewQueueItem | null>(null);
  const [reviewDialogComment, setReviewDialogComment] = useState('');

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

  const {
    data: reviewQueue,
    isLoading: isReviewQueueLoading,
    refetch: refetchReviewQueue,
  } = useQuery<AssignmentReviewQueueResponse>({
    queryKey: ['admin', 'assignments', 'review-queue', reviewStatusFilter],
    queryFn: () =>
      api.assignments.reviewQueue({
        status: reviewStatusFilter,
        page: 1,
        limit: 20,
      }),
  });

  useEffect(() => {
    if (!selectedReviewAssignment) {
      setReviewDialogComment('');
      return;
    }
    setReviewDialogComment(selectedReviewAssignment.reviewComment ?? '');
  }, [selectedReviewAssignment]);

  const reviewDetailsQuery = useQuery<AssignmentDetails, HttpError | Error>({
    queryKey: ['review', selectedReviewAssignment?.id, 'details'],
    queryFn: () =>
      api.assignments
        .details(selectedReviewAssignment?.id ?? '')
        .then(mapAssignmentDetailsFromApi),
    enabled: Boolean(selectedReviewAssignment),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitAssignmentReviewPayload }) =>
      api.assignments.review(id, payload),
    onSuccess: () => {
      toast.success('Peržiūra išsaugota');
      setSelectedReviewAssignment(null);
      refetchReviewQueue();
    },
    onError: (mutationError: HttpError | Error) => {
      toast.error('Nepavyko atnaujinti peržiūros', {
        description: getErrorMessage(mutationError),
      });
    },
  });

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

  const openReviewDialog = (assignment: AssignmentReviewQueueItem) => {
    setSelectedReviewAssignment(assignment);
  };

  const closeReviewDialog = () => {
    setSelectedReviewAssignment(null);
    setReviewDialogComment('');
  };

  const handleReviewAction = (status: AssignmentReviewStatus.APPROVED | AssignmentReviewStatus.REJECTED) => {
    if (!selectedReviewAssignment || reviewMutation.isLoading) {
      return;
    }

    reviewMutation.mutate({
      id: selectedReviewAssignment.id,
      payload: {
        status,
        comment: reviewDialogComment.trim() || undefined,
      },
    });
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'review'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-foreground hover:border-foreground'
              }`}
            >
              Užduoties įvertinimas
              {reviewQueue?.counts.pending ? (
                <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive text-[0.65rem] font-semibold text-white">
                  {reviewQueue.counts.pending}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('created')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'created'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-foreground hover:border-foreground'
              }`}
            >
              Sukurtos užduotys
            </button>
          </div>

          {activeTab === 'review' && (
            <Card className="shadow-custom">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-lg">Užduoties įvertinimas</CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      Laukia: <strong>{reviewQueue?.counts.pending ?? 0}</strong>
                    </span>
                    <span>
                      Patvirtintos: <strong>{reviewQueue?.counts.approved ?? 0}</strong>
                    </span>
                    <span>
                      Atmestos: <strong>{reviewQueue?.counts.rejected ?? 0}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Select
                    value={reviewStatusFilter}
                    onValueChange={(value) =>
                      setReviewStatusFilter(value as AssignmentReviewStatus | 'all')
                    }
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Filtruoti pagal būseną" />
                    </SelectTrigger>
                    <SelectContent>
                      {reviewStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {isReviewQueueLoading ? (
                  <div className="py-6 text-center text-muted-foreground">Kraunama...</div>
                ) : reviewQueue?.data.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Užduotis</th>
                        <th className="px-3 py-2 text-left">Vartotojas</th>
                        <th className="px-3 py-2 text-left">Avilys</th>
                        <th className="px-3 py-2 text-left">Įvertinimas</th>
                        <th className="px-3 py-2 text-left">Žemėlapis</th>
                        <th className="px-3 py-2 text-left">Užbaigta</th>
                        <th className="px-3 py-2 text-left">Veiksmai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQueue.data.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-3">{item.taskTitle}</td>
                          <td className="px-3 py-3">{item.userName}</td>
                          <td className="px-3 py-3">{item.hiveLabel}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {renderRatingStars(item.rating)}
                              <span>{item.rating ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline">
                              {item.reviewStatus}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">{formatShortDate(item.completedAt)}</td>
                          <td className="px-3 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReviewDialog(item)}
                            >
                              Peržiūrėti
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    Nėra peržiūros laukiančių užduočių.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'created' && (
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
          )}
        </div>

        {activeTab === 'created' ? (
          isLoading ? (
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
          )
        ) : null}
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

      <Dialog
        open={Boolean(selectedReviewAssignment)}
        onOpenChange={(open) => !open && closeReviewDialog()}
      >
        <DialogContent className="w-full max-h-[90vh] sm:max-w-3xl flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Užduoties peržiūra</DialogTitle>
            <DialogDescription>
              Peržvelkite vartotojo pateiktus duomenis ir patvirtinkite ar atmėskite užduotį.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Užduotis</p>
              <p className="text-lg font-semibold">
                {selectedReviewAssignment?.taskTitle ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Vartotojas: {selectedReviewAssignment?.userName ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Avilys: {selectedReviewAssignment?.hiveLabel ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Įvertinimas:{' '}
                <span className="inline-flex items-center gap-1">
                  {renderRatingStars(selectedReviewAssignment?.rating ?? null)}
                  <span>{selectedReviewAssignment?.rating ?? '—'}</span>
                </span>
              </p>
              {selectedReviewAssignment?.ratingComment ? (
                <p className="text-sm text-muted-foreground">{selectedReviewAssignment.ratingComment}</p>
              ) : null}
            </div>

            {reviewDetailsQuery.isLoading ? (
              <div className="py-6 text-center text-muted-foreground">Kraunama...</div>
            ) : reviewDetailsQuery.data ? (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Žingsniai</p>
                  <ul className="space-y-2 text-sm">
                    {reviewDetailsQuery.data.task.steps.map((step, index) => {
                      const progressEntry = reviewDetailsQuery.data?.progress.find(
                        (entry) => entry.taskStepId === step.id,
                      );
                      const isCompleted = progressEntry?.status === 'completed';
                      return (
                        <li
                          key={step.id}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                        >
                          <span>
                            {index + 1}. {step.title}
                          </span>
                          <Badge variant={isCompleted ? 'secondary' : 'outline'}>
                            {isCompleted ? 'Atliktas' : 'Neatliktas'}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {reviewDetailsQuery.data.progress
                  .filter((entry) => entry.evidenceUrl)
                  .map((entry) => (
                    <div key={entry.id} className="space-y-2">
                      <p className="text-sm font-semibold">Įrodymas</p>
                      <div className="mx-auto w-full max-w-[600px]">
                        <ResponsiveMedia
                          url={entry.evidenceUrl ?? undefined}
                          type="image"
                          title="Įkelta nuotrauka"
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Neįmanoma užkrauti užduoties detalių.</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="review-comment" className="text-sm">
                Administratoriaus pastaba
              </Label>
              <Textarea
                id="review-comment"
                value={reviewDialogComment}
                onChange={(event) => setReviewDialogComment(event.target.value)}
                placeholder="Papildomos pastabos avilio istorijai..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleReviewAction('rejected')}
              disabled={reviewMutation.isLoading}
            >
              Nepatvirtinta
            </Button>
            <Button onClick={() => handleReviewAction('approved')} disabled={reviewMutation.isLoading}>
              Patvirtinta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
