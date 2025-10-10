import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import api, { type HttpError } from '@/lib/api';
import {
  mapAssignmentDetailsFromApi,
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapStepProgressFromApi,
  type AssignmentDetails,
  type AssignmentStatus,
  type Hive,
  type StepProgress,
  type UpdateProgressPayload,
} from '@/lib/types';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
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
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timeouts = saveTimeouts.current;
    return () => {
      Object.values(timeouts).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<AssignmentDetails, HttpError | Error>({
    queryKey: ['assignments', id, 'details'],
    queryFn: () => api.assignments.details(id ?? '').then(mapAssignmentDetailsFromApi),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data) return;
    setStepNotes((prev) => {
      const next = { ...prev };
      data.progress.forEach((entry) => {
        next[entry.taskStepId] = entry.notes ?? '';
      });
      return next;
    });
  }, [data]);

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
    return new Set(data.progress.map((item) => item.taskStepId));
  }, [data]);

  const currentStep = steps[currentStepIndex];
  const assignment = data?.assignment;
  const hiveId = assignment?.hiveId;
  const currentNotes = currentStep ? stepNotes[currentStep.id] ?? '' : '';
  const currentProgress = currentStep ? progressMap.get(currentStep.id) : undefined;

  const scheduleNoteSave = (stepId: string, value: string) => {
    const progressEntry = progressMap.get(stepId);
    if (!progressEntry) return;
    const normalizedValue = value;
    if ((progressEntry.notes ?? '') === normalizedValue) return;
    const existingTimeout = saveTimeouts.current[stepId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeoutId = setTimeout(() => {
      updateProgressMutation.mutate({
        progressId: progressEntry.id,
        taskStepId: stepId,
        payload: { notes: normalizedValue || null },
      });
    }, 500);
    saveTimeouts.current[stepId] = timeoutId;
  };

  const { data: hive } = useQuery<Hive>({
    queryKey: ['hives', hiveId],
    queryFn: () => api.hives.details(hiveId ?? '').then(mapHiveFromApi),
    enabled: Boolean(hiveId),
  });

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

  const updateProgressMutation = useMutation<
    StepProgress,
    HttpError | Error,
    { progressId: string; taskStepId: string; payload: UpdateProgressPayload }
  >({
    mutationFn: ({ progressId, payload }) => api.progress.update(progressId, payload).then(mapStepProgressFromApi),
    onSuccess: (updatedProgress) => {
      queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'details'], (oldData) => {
        if (!oldData) return oldData;
        const progress = oldData.progress.map((entry) => (entry.id === updatedProgress.id ? updatedProgress : entry));
        return { ...oldData, progress };
      });
      setStepNotes((prev) => ({ ...prev, [updatedProgress.taskStepId]: updatedProgress.notes ?? '' }));
      delete saveTimeouts.current[updatedProgress.taskStepId];
    },
    onError: (mutationError: HttpError | Error, variables) => {
      if (variables) {
        delete saveTimeouts.current[variables.taskStepId];
      }
      toast.error('Nepavyko išsaugoti pastabų', {
        description: getErrorMessage(mutationError),
      });
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: (payload: { taskStepId: string; notes?: string }) =>
      api.progress
        .completeStep({ assignmentId: id!, taskStepId: payload.taskStepId, notes: payload.notes })
        .then(mapStepProgressFromApi),
    onSuccess: (progressEntry) => {
      let previousStatus: AssignmentStatus | undefined;
      let newCompletion = data?.completion ?? 0;
      let added = false;

      queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'details'], (oldData) => {
        if (!oldData) return oldData;
        previousStatus = oldData.assignment.status;
        if (oldData.progress.some((item) => item.taskStepId === progressEntry.taskStepId)) {
          newCompletion = oldData.completion;
          return oldData;
        }

        added = true;
        const updatedProgress: StepProgress[] = [...oldData.progress, progressEntry];
        const totalSteps = oldData.task.steps.length;
        newCompletion = totalSteps ? Math.round((updatedProgress.length / totalSteps) * 100) : 0;

        return {
          ...oldData,
          progress: updatedProgress,
          completion: newCompletion,
        };
      });

      setStepNotes((prev) => ({ ...prev, [progressEntry.taskStepId]: progressEntry.notes ?? '' }));

      queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });

      if (added) {
        toast.success('Žingsnis pažymėtas kaip atliktas');

        if (previousStatus === 'not_started' && newCompletion < 100) {
          updateAssignmentStatusMutation.mutate('in_progress');
        }

        if (newCompletion === 100) {
          updateAssignmentStatusMutation.mutate('done');
          toast.success('Užduotis užbaigta!');
          setTimeout(() => navigate('/tasks'), 1500);
        } else if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((index) => index + 1);
        }
      }
    },
    onError: (stepError: HttpError | Error) => {
      toast.error('Nepavyko pažymėti žingsnio', {
        description: getErrorMessage(stepError),
      });
    },
  });

  const uncompleteStepMutation = useMutation<void, HttpError | Error, { progressId: string; taskStepId: string }>(
    {
      mutationFn: ({ progressId }) => api.progress.remove(progressId),
      onSuccess: (_, variables) => {
        let newCompletion = data?.completion ?? 0;
        const previousStatus = data?.assignment.status;

        queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'details'], (oldData) => {
          if (!oldData) return oldData;
          const progress = oldData.progress.filter((entry) => entry.id !== variables.progressId);
          const totalSteps = oldData.task.steps.length;
          newCompletion = totalSteps ? Math.round((progress.length / totalSteps) * 100) : 0;
          return { ...oldData, progress, completion: newCompletion };
        });

        setStepNotes((prev) => ({ ...prev, [variables.taskStepId]: '' }));
        delete saveTimeouts.current[variables.taskStepId];

        queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });

        if (newCompletion === 0 && previousStatus !== 'not_started') {
          updateAssignmentStatusMutation.mutate('not_started');
        } else if (newCompletion < 100 && previousStatus === 'done') {
          updateAssignmentStatusMutation.mutate('in_progress');
        }

        toast.success('Žingsnis grąžintas į neįvykdytą');
      },
      onError: (mutationError: HttpError | Error) => {
        toast.error('Nepavyko atšaukti žingsnio', {
          description: getErrorMessage(mutationError),
        });
      },
    }
  );

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
  const hasCurrentStepCompleted = currentStep ? completedStepIds.has(currentStep.id) : false;

  const handlePrevStep = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleNextStep = () => {
    setCurrentStepIndex((index) => Math.min(steps.length - 1, index + 1));
  };

  const handleStepComplete = () => {
    if (!currentStep || completeStepMutation.isPending) return;
    const existingTimeout = saveTimeouts.current[currentStep.id];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete saveTimeouts.current[currentStep.id];
    }
    completeStepMutation.mutate({ taskStepId: currentStep.id, notes: currentNotes || undefined });
  };

  const handleStepUncomplete = () => {
    if (!currentProgress || uncompleteStepMutation.isPending) return;
    const existingTimeout = saveTimeouts.current[currentProgress.taskStepId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete saveTimeouts.current[currentProgress.taskStepId];
    }
    uncompleteStepMutation.mutate({
      progressId: currentProgress.id,
      taskStepId: currentProgress.taskStepId,
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
              <span className="hidden md:inline">•</span>
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

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-success/10 text-success'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
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
                      Žingsnis {currentStepIndex + 1} iš {steps.length}
                    </p>
                    <CardTitle className="text-2xl">{currentStep?.title ?? 'Žingsnis nerastas'}</CardTitle>
                  </div>
                  {hasCurrentStepCompleted ? <CheckCircle2 className="h-6 w-6 text-success" /> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-2 font-semibold">Instrukcijos</h4>
                  <p className="text-foreground">
                    {currentStep?.contentText ?? 'Šio žingsnio instrukcijos nepateiktos.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Pastabos (išsaugoma automatiškai)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Įveskite savo pastabas..."
                    value={currentNotes}
                    onChange={(event) => {
                      if (!currentStep) return;
                      const value = event.target.value;
                      setStepNotes((prev) => ({ ...prev, [currentStep.id]: value }));
                      if (progressMap.has(currentStep.id)) {
                        scheduleNoteSave(currentStep.id, value);
                      }
                    }}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Žingsnis sukurtas: {currentStep ? formatDate(currentStep.createdAt) : '—'}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" onClick={handlePrevStep} disabled={currentStepIndex === 0}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Atgal
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {hasCurrentStepCompleted ? (
                  <Button
                    variant="outline"
                    onClick={handleStepUncomplete}
                    disabled={uncompleteStepMutation.isPending}
                  >
                    {uncompleteStepMutation.isPending ? (
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
                  <Button onClick={handleStepComplete} disabled={completeStepMutation.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {completeStepMutation.isPending ? 'Žymima...' : 'Pažymėti kaip atliktą'}
                  </Button>
                )}

                {currentStepIndex < steps.length - 1 ? (
                  <Button variant="outline" onClick={handleNextStep}>
                    Kitas žingsnis
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

