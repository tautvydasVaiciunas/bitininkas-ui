import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveMedia } from '@/components/media/ResponsiveMedia';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import { Badge } from '@/components/ui/badge';
import api, {
  type AssignmentStepMediaResponse,
  type HttpError,
  type SubmitAssignmentRatingPayload,
} from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapStepToggleResponseFromApi,
  type Assignment,
  type AssignmentDetails,
  type AssignmentStatus,
  type Hive,
  type StepProgress,
  type StepProgressToggleResult,
} from '@/lib/types';
import { inferMediaType, resolveMediaUrl } from '@/lib/media';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Star } from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getErrorMessage = (error: unknown) => {
  if (!error) return 'Įvyko nenumatyta klaida';
  if (error instanceof Error) return error.message;
  return 'Įvyko nenumatyta klaida';
};

export default function TaskRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<AssignmentDetails, HttpError | Error>({
    queryKey: ['assignments', id, 'run'],
    queryFn: () => api.assignments.run(id ?? '').then(mapAssignmentDetailsFromApi),
    enabled: Boolean(id),
  });

  const steps = useMemo(() => {
    if (!data) return [];
    return [...data.task.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [data]);

  const progressMap = useMemo(() => {
    if (!data) return new Map<string, StepProgress>();
    return new Map(data.progress.map((entry) => [entry.taskStepId, entry]));
  }, [data]);

  const completedStepIds = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(
      data.progress
        .filter((item) => item.status === 'completed')
        .map((item) => item.taskStepId),
    );
  }, [data]);

  const allStepsCompleted = steps.length === 0 || steps.every((step) => completedStepIds.has(step.id));
  const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : undefined;
  const assignment = data?.assignment;
  const hiveId = assignment?.hiveId;
  const currentProgress = currentStep ? progressMap.get(currentStep.id) : undefined;
  const currentMediaUrl = resolveMediaUrl(currentStep?.mediaUrl ?? null);
  const currentMediaType = inferMediaType(currentStep?.mediaType ?? null, currentMediaUrl);
  const existingMedia = currentProgress?.media ?? [];
  const requiresUserMedia = currentStep?.requireUserMedia ?? false;
  const hasUploadedMedia = existingMedia.length > 0;

  const lastCompletedStepIndex = useMemo(() => {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      if (completedStepIds.has(steps[index].id)) {
        return index;
      }
    }
    return -1;
  }, [steps, completedStepIds]);

  const hasCurrentStepCompleted = Boolean(currentProgress?.status === 'completed');
  const canUncompleteCurrentStep = hasCurrentStepCompleted && currentStepIndex === lastCompletedStepIndex;
  const isRatingStep = currentStepIndex >= steps.length;

  useEffect(() => {
    setSelectedMediaFile(null);
    setMediaError(null);
  }, [currentStep?.id]);

  useEffect(() => {
    if (!assignment) return;
    setRatingValue(assignment.rating ?? null);
    setRatingComment(assignment.ratingComment ?? '');
  }, [assignment]);

  useEffect(() => {
    if (currentStepIndex > steps.length) {
      setCurrentStepIndex(steps.length);
    }
  }, [currentStepIndex, steps.length]);

  const { data: hive } = useQuery<Hive>({
    queryKey: ['hives', hiveId],
    queryFn: () => api.hives.details(hiveId ?? '').then(mapHiveFromApi),
    enabled: Boolean(hiveId),
  });

  const uploadMediaMutation = useMutation<
    AssignmentStepMediaResponse,
    HttpError | Error,
    { stepId: string; file: File }
  >({
    mutationFn: ({ stepId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.assignments.uploadStepMedia(id!, stepId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', id, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['assignments', id, 'run'] });
      toast.success('Failas įkeltas');
      setSelectedMediaFile(null);
      setMediaError(null);
    },
    onError: (error) => {
      setMediaError(getErrorMessage(error));
    },
  });

  const getMaxBytesForFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      return 10 * 1024 * 1024;
    }
    if (file.type.startsWith('video/')) {
      return 30 * 1024 * 1024;
    }
    return 0;
  };

  const handleMediaFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentStep?.id) {
      event.target.value = '';
      return;
    }

    const maxBytes = getMaxBytesForFile(file);
    if (maxBytes > 0 && file.size > maxBytes) {
      setMediaError('Failas per didelis. Maksimalus dydis: 10 MB nuotraukai, 30 MB vaizdo įrašui.');
      setSelectedMediaFile(null);
      event.target.value = '';
      return;
    }

    setSelectedMediaFile(file);
    setMediaError(null);
    uploadMediaMutation.mutate({ stepId: currentStep.id, file });
    event.target.value = '';
  };

  const updateAssignmentStatusMutation = useMutation({
    mutationFn: (status: AssignmentStatus) => api.assignments.update(id!, { status }).then(mapAssignmentFromApi),
    onSuccess: (updatedAssignment) => {
      queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'details'], (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, assignment: updatedAssignment };
      });
      queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });
    },
    onError: (mutationError: HttpError | Error) => {
      toast.error('Nepavyko atnaujinti užduoties būsenos', {
        description: getErrorMessage(mutationError),
      });
    },
  });

  const toggleStepMutation = useMutation<
    StepProgressToggleResult,
    HttpError | Error,
    { taskStepId: string; stepIndex: number }
  >({
    mutationFn: (payload) =>
      api.progress.completeStep({ assignmentId: id!, taskStepId: payload.taskStepId }).then(mapStepToggleResponseFromApi),
    onSuccess: (result, variables) => {
      const progressEntry = result.progress;
      let previousAssignmentStatus: AssignmentStatus | undefined;
      let previousStepStatus: StepProgress['status'] | undefined;
      let newCompletion = data?.completion ?? 0;

      queryClient.setQueryData<AssignmentDetails | undefined>(
        ['assignments', id, 'details'],
        (oldData) => {
          if (!oldData) return oldData;
          previousAssignmentStatus = oldData.assignment.status;
          previousStepStatus = oldData.progress.find(
            (item) => item.taskStepId === progressEntry.taskStepId,
          )?.status;

          const progress = [...oldData.progress];
          const existingIndex = progress.findIndex((item) => item.id === progressEntry.id);
          if (existingIndex >= 0) {
            progress[existingIndex] = progressEntry;
          } else {
            progress.push(progressEntry);
          }

          const completedCount = progress.filter((item) => item.status === 'completed').length;
          const totalSteps = oldData.task.steps.length;
          newCompletion = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;

          return { ...oldData, progress, completion: newCompletion };
        },
      );

      queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });

      if (result.status === 'completed') {
        if (previousStepStatus !== 'completed') {
          toast.success('Žingsnis pažymėtas kaip atliktas');

          if (previousAssignmentStatus === 'not_started' && newCompletion < 100) {
            updateAssignmentStatusMutation.mutate('in_progress');
          } else if (newCompletion === 100) {
            updateAssignmentStatusMutation.mutate('done');
            toast.success('Visi žingsniai atlikti – prašome pateikti vertinimą.');
          }

          if (variables?.stepIndex !== undefined) {
            setCurrentStepIndex(Math.min(steps.length, variables.stepIndex + 1));
          }
        }
        return;
      }

      if (
        previousAssignmentStatus &&
        newCompletion === 0 &&
        previousAssignmentStatus !== 'not_started'
      ) {
        updateAssignmentStatusMutation.mutate('not_started');
      } else if (previousAssignmentStatus === 'done' && newCompletion < 100) {
        updateAssignmentStatusMutation.mutate('in_progress');
      }

      if (variables?.stepIndex !== undefined) {
        setCurrentStepIndex(Math.min(steps.length - 1, Math.max(0, variables.stepIndex)));
      }

      toast.success('Žingsnis grąžintas į neįvykdytą');
    },
    onError: (stepError: HttpError | Error) => {
      toast.error('Nepavyko atnaujinti žingsnio būsenos', {
        description: getErrorMessage(stepError),
      });
    },
  });

  const ratingMutation = useMutation<
    Assignment,
    HttpError | Error,
    SubmitAssignmentRatingPayload
  >({
    mutationFn: (payload) =>
      api.assignments.rate(id!, payload).then(mapAssignmentFromApi),
    onSuccess: (updatedAssignment) => {
      queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'details'], (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, assignment: updatedAssignment };
      });
      toast.success('Ačiū už vertinimą');
      navigate('/tasks');
    },
    onError: (ratingError: HttpError | Error) => {
      toast.error('Nepavyko išsiųsti vertinimo', {
        description: getErrorMessage(ratingError),
      });
    },
  });

  if (!id) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center text-muted-foreground">
            Užduoties ID nerastas.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
            <ChevronLeft className="mr-2 h-4 w-4" /> Grįžti
          </Button>
          <Card className="shadow-custom">
            <CardContent className="space-y-6 p-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (isError || !data || !assignment) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Užduotis nerasta</h3>
            <p className="text-muted-foreground mb-6">{getErrorMessage(error)}</p>
            <Button onClick={() => navigate('/tasks')}>Grįžti į užduotis</Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const progressPercent = data.completion ?? 0;
  const totalStepsCount = steps.length + 1;
  const currentStepNumber = Math.min(currentStepIndex + 1, totalStepsCount);

  const handlePrevStep = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleNextStep = () => {
    setCurrentStepIndex((index) => Math.min(steps.length, index + 1));
  };

  const handleStepComplete = () => {
    if (!currentStep || toggleStepMutation.isPending) return;
    toggleStepMutation.mutate({ taskStepId: currentStep.id, stepIndex: currentStepIndex });
  };

  const handleStepUncomplete = () => {
    if (
      !currentProgress ||
      toggleStepMutation.isPending ||
      !canUncompleteCurrentStep
    ) {
      return;
    }
    toggleStepMutation.mutate({ taskStepId: currentProgress.taskStepId, stepIndex: currentStepIndex });
  };

  const hasRated = Boolean(assignment?.ratedAt);
  const canSubmitRating =
    isRatingStep && ratingValue !== null && !hasRated;
  const handleSubmitRating = () => {
    if (!id || !canSubmitRating || ratingMutation.isPending) {
      return;
    }

    ratingMutation.mutate({
      rating: ratingValue,
      ratingComment: ratingComment.trim() || undefined,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{data.task.title}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-3 text-sm md:text-base">
              <span>Avilys: {hive?.label ?? assignment.hiveId}</span>
              <span className="hidden md:inline">—</span>
              <span>Terminas: {formatDate(assignment.dueDate)}</span>
            </p>
          </div>
          <AssignmentStatusBadge status={assignment.status} dueDate={assignment.dueDate} />
        </div>

        {/* Progress Bar */}
        <Card className="shadow-custom">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bendras progresas</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Steps Sidebar */}
          <Card className="shadow-custom h-fit lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Žingsniai</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = completedStepIds.has(step.id);
                const isActive = index === currentStepIndex;
                const maxSelectable = Math.min(steps.length - 1, lastCompletedStepIndex + 1);
                const isSelectable = index <= maxSelectable;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isSelectable) {
                        setCurrentStepIndex(index);
                      }
                    }}
                    disabled={!isSelectable}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-success/10 text-success'
                        : 'bg-muted hover:bg-muted/80'
                    } ${!isSelectable ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs">
                          {index + 1}
                        </div>
                      )}
                      <span className="text-sm font-medium line-clamp-2">{step.title}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="space-y-6 lg:col-span-3">
            <Card className="shadow-custom">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="mb-1 text-sm text-muted-foreground">
                      {isRatingStep
                        ? 'Paskutinis žingsnis'
                        : `Žingsnis ${currentStepIndex + 1} iš ${steps.length}`}
                    </p>
                    <CardTitle className="text-2xl">
                      {isRatingStep ? 'Užduoties vertinimas' : currentStep?.title ?? 'Žingsnis nerastas'}
                    </CardTitle>
                  </div>
                  {!isRatingStep && hasCurrentStepCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isRatingStep ? (
                  <div className="space-y-6">
                    <p className="text-foreground">
                      Mums svarbi jūsų nuomonė – ar užduotis buvo aiški? Ką galėtume aprašyti geriau?
                      Įvertinkite ir padėkite mums tobulėti.
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const value = index + 1;
                        const isActiveStar = ratingValue !== null && ratingValue >= value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRatingValue(value)}
                            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            aria-label={`${value} žvaigždutės`}
                          >
                            <Star
                              className={`h-8 w-8 transition-colors ${
                                isActiveStar ? 'text-amber-500' : 'text-muted-foreground'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ratingComment">Komentaras (neprivaloma)</Label>
                      <Textarea
                        id="ratingComment"
                        value={ratingComment}
                        placeholder="Palikite savo pastabas apie užduotį..."
                        rows={4}
                        onChange={(event) => setRatingComment(event.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="mb-2 font-semibold">Instrukcijos</h4>
                      <p className="text-foreground">
                        {currentStep?.contentText ?? 'Šio žingsnio instrukcijos nepateiktos.'}
                      </p>
                    </div>
                    {currentMediaUrl ? (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Prisegtas failas</h4>
                        <div className="mx-auto w-full max-w-[600px]">
                          <ResponsiveMedia
                            url={currentMediaUrl}
                            type={currentMediaType}
                            title={currentStep?.title ?? 'Žingsnis'}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    ) : null}
                    {requiresUserMedia ? (
                      <>
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-50 text-amber-700">
                          Šiam žingsniui reikalinga jūsų nuotrauka arba vaizdo įrašas
                        </Badge>
                        <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => mediaInputRef.current?.click()}
                              disabled={uploadMediaMutation.isPending}
                            >
                              Įkelti nuotrauką / vaizdo įrašą
                            </Button>
                            <input
                              ref={mediaInputRef}
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={handleMediaFileChange}
                            />
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {uploadMediaMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Įkeliama...
                                </>
                              ) : selectedMediaFile ? (
                                <>Pasirinkta: {selectedMediaFile.name}</>
                              ) : hasUploadedMedia ? (
                                <>
                                  {existingMedia.length === 1
                                    ? '1 failas įkeltas'
                                    : `${existingMedia.length} failai įkelti`}
                                </>
                              ) : (
                                'Pasirinkite failą, kad galėtumėte pažymėti žingsnį'
                              )}
                            </div>
                          </div>
                          {mediaError ? (
                            <p className="text-sm text-destructive" role="alert">
                              {mediaError}
                            </p>
                          ) : null}
                          {hasUploadedMedia ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-foreground">Įkelti failai</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                {existingMedia.map((item) => {
                                  const uploadedAt = new Date(item.createdAt);
                                  const timeLabel = Number.isNaN(uploadedAt.getTime())
                                    ? ''
                                    : uploadedAt.toLocaleTimeString('lt-LT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      });
                                  return (
                                    <div key={item.id} className="space-y-1">
                                      <ResponsiveMedia
                                        url={item.url}
                                        type={item.kind === 'video' ? 'video' : 'image'}
                                        title={currentStep?.title ?? 'Žingsnis'}
                                        className="h-36 w-full rounded-lg bg-muted"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Įkelta {formatDate(item.createdAt)}
                                        {timeLabel ? `, ${timeLabel}` : ''}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="relative">
                <div className="flex w-full overflow-hidden rounded-lg border bg-background">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    className="flex flex-1 items-center justify-start gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Atgal
                  </button>
                  <div className="w-px bg-border" />
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={currentStepIndex >= steps.length}
                    className="flex flex-1 items-center justify-end gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  >
                    Toliau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {currentStepNumber} iš {totalStepsCount}
                </div>
              </div>

              {isRatingStep ? (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleSubmitRating}
                    disabled={!canSubmitRating || ratingMutation.isPending}
                  >
                    {ratingMutation.isPending
                      ? 'Siunčiama...'
                      : hasRated
                      ? 'Vertinimas išsaugotas'
                      : 'Siųsti vertinimą'}
                  </Button>
                  {assignment?.rating ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Jūsų paskutinis įvertinimas: {assignment.rating} / 5
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  {hasCurrentStepCompleted ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleStepUncomplete}
                      disabled={!canUncompleteCurrentStep || toggleStepMutation.isPending}
                    >
                      {toggleStepMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Grąžinama...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Pažymėti kaip neatliktą
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleStepComplete}
                      disabled={
                        toggleStepMutation.isPending || (requiresUserMedia && !hasUploadedMedia)
                      }
                      title={
                        requiresUserMedia && !hasUploadedMedia
                          ? 'Įkelkite nuotrauką arba vaizdo įrašą, kad galėtumėte pažymėti žingsnį'
                          : undefined
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {toggleStepMutation.isPending ? 'Žymima...' : 'Atlikta'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}




