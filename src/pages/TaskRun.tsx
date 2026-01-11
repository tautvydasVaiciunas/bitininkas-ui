import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { TaskExecutionLayout } from '@/components/tasks/TaskExecutionLayout';
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
import { ChevronLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

type PendingMediaDeletion = {
  media: AssignmentStepMediaResponse;
  stepId: string;
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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingMediaDeletion, setPendingMediaDeletion] = useState<PendingMediaDeletion | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

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
      queryClient.setQueryData<AssignmentDetails | undefined>(['assignments', id, 'run'], (oldData) => {
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

  const deleteMediaMutation = useMutation<
    { success: boolean },
    HttpError | Error,
    { stepId: string; media: AssignmentStepMediaResponse }
  >({
    mutationFn: ({ stepId, media }) => api.assignments.deleteStepMedia(id!, stepId, media.id),
    onSuccess: (_, { stepId, media }) => {
      queryClient.setQueryData<AssignmentDetails | undefined>(
        ['assignments', id, 'run'],
        (oldData) => removeMediaFromProgress(oldData, stepId, media.id),
      );
      queryClient.setQueryData<AssignmentDetails | undefined>(
        ['assignments', id, 'details'],
        (oldData) => removeMediaFromProgress(oldData, stepId, media.id),
      );
      toast.success('Failas pašalintas');
      setPendingMediaDeletion(null);
      setIsRemoveDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Nepavyko pašalinti failo', {
        description: getErrorMessage(error),
      });
    },
  });

  const removeMediaFromProgress = (
    oldData: AssignmentDetails | undefined,
    stepId: string,
    mediaId: string,
  ) => {
    if (!oldData) return oldData;
    const progress = oldData.progress.map((entry) =>
      entry.taskStepId === stepId
        ? { ...entry, media: entry.media?.filter((item) => item.id !== mediaId) ?? [] }
        : entry,
    );
    return { ...oldData, progress };
  };

  const toggleStepMutation = useMutation<
    StepProgressToggleResult,
    HttpError | Error,
    { taskStepId: string; stepIndex: number }
  >({
    mutationFn: (payload) =>
      api.progress.completeStep({ assignmentId: id!, taskStepId: payload.taskStepId }).then(mapStepToggleResponseFromApi),
    onSuccess: (result, variables) => {
      const progressEntry = result.progress;
      const previousAssignmentStatus = data?.assignment.status;
      const previousStepStatus = currentProgress?.status;
      let updatedCompletion = data?.completion ?? 0;

      const mergeProgress = (oldData?: AssignmentDetails) => {
        if (!oldData) {
          return null;
        }
        const progress = [...oldData.progress];
        const existingIndex = progress.findIndex((item) => item.id === progressEntry.id);
        if (existingIndex >= 0) {
          progress[existingIndex] = progressEntry;
        } else {
          progress.push(progressEntry);
        }
        const completedCount = progress.filter((item) => item.status === 'completed').length;
        const totalSteps = oldData.task.steps.length;
        const completion = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;
        return {
          data: { ...oldData, progress, completion },
          completion,
        };
      };

      queryClient.setQueryData<AssignmentDetails | undefined>(
        ['assignments', id, 'run'],
        (oldData) => {
          const merged = mergeProgress(oldData);
          if (!merged) return oldData;
          updatedCompletion = merged.completion;
          return merged.data;
        },
      );

      queryClient.setQueryData<AssignmentDetails | undefined>(
        ['assignments', id, 'details'],
        (oldData) => {
          const merged = mergeProgress(oldData);
          return merged ? merged.data : oldData;
        },
      );

      queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });

      if (result.status === 'completed') {
        if (previousStepStatus !== 'completed') {
          toast.success('Zingsnis pazymetas kaip atliktas');

          if (previousAssignmentStatus === 'not_started' && updatedCompletion < 100) {
            updateAssignmentStatusMutation.mutate('in_progress');
          } else if (updatedCompletion === 100) {
            updateAssignmentStatusMutation.mutate('done');
            toast.success('Visi zingsniai atlikti - prasome pateikti vertinima.');
          }

          if (variables?.stepIndex !== undefined) {
            setCurrentStepIndex(Math.min(steps.length, variables.stepIndex + 1));
          }
        }
        return;
      }

      if (
        previousAssignmentStatus &&
        updatedCompletion === 0 &&
        previousAssignmentStatus !== 'not_started'
      ) {
        updateAssignmentStatusMutation.mutate('not_started');
      } else if (previousAssignmentStatus === 'done' && updatedCompletion < 100) {
        updateAssignmentStatusMutation.mutate('in_progress');
      }

      if (variables?.stepIndex !== undefined) {
        setCurrentStepIndex(Math.min(steps.length - 1, Math.max(0, variables.stepIndex)));
      }

      toast.success('Zingsnis grazintas i neivykdyta');
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

  const handleRemoveMediaClick = (media: AssignmentStepMediaResponse) => {
    if (!currentStep?.id) {
      return;
    }
    setPendingMediaDeletion({ media, stepId: currentStep.id });
    setIsRemoveDialogOpen(true);
  };

  const handleRemoveDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPendingMediaDeletion(null);
    }
    setIsRemoveDialogOpen(open);
  };

  const handleDeleteConfirm = () => {
    if (!pendingMediaDeletion || deleteMediaMutation.isPending) {
      return;
    }
    deleteMediaMutation.mutate({
      stepId: pendingMediaDeletion.stepId,
      media: pendingMediaDeletion.media,
    });
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
      <TaskExecutionLayout
        title={data.task.title}
        hiveLabel={hive?.label ?? assignment.hiveId}
        dueDate={assignment.dueDate}
        status={assignment.status}
        progressPercent={progressPercent}
        steps={steps}
        currentStepIndex={currentStepIndex}
        setCurrentStepIndex={setCurrentStepIndex}
        completedStepIds={completedStepIds}
        lastCompletedStepIndex={lastCompletedStepIndex}
        currentStep={currentStep}
        currentProgress={currentProgress}
        currentMediaUrl={currentMediaUrl}
        currentMediaType={currentMediaType}
        requiresUserMedia={requiresUserMedia}
        existingMedia={existingMedia}
        hasUploadedMedia={hasUploadedMedia}
        mediaError={mediaError}
        selectedMediaFileName={selectedMediaFile?.name ?? null}
        uploadPending={uploadMediaMutation.isPending}
        mediaInputRef={mediaInputRef}
        onUploadClick={() => mediaInputRef.current?.click()}
        onFileChange={handleMediaFileChange}
        isRatingStep={isRatingStep}
        ratingValue={ratingValue}
        ratingComment={ratingComment}
        onRatingChange={setRatingValue}
        onRatingCommentChange={setRatingComment}
        canSubmitRating={canSubmitRating}
        ratingSubmitPending={ratingMutation.isPending}
        onSubmitRating={handleSubmitRating}
        hasRated={hasRated}
        handlePrevStep={handlePrevStep}
        handleNextStep={handleNextStep}
        currentStepNumber={currentStepNumber}
        totalStepsCount={totalStepsCount}
        hasCurrentStepCompleted={hasCurrentStepCompleted}
        onStepComplete={handleStepComplete}
        onStepUncomplete={handleStepUncomplete}
        toggleStepPending={toggleStepMutation.isPending}
        canUncompleteCurrentStep={canUncompleteCurrentStep}
        assignmentRating={assignment.rating ?? null}
        cameraInputRef={cameraInputRef}
        onRemoveMedia={handleRemoveMediaClick}
        removeMediaPending={deleteMediaMutation.isPending}
      />
      <AlertDialog
        open={isRemoveDialogOpen && Boolean(pendingMediaDeletion)}
        onOpenChange={handleRemoveDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti failą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti šį failą?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMediaMutation.isPending}>
              Atšaukti
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={!pendingMediaDeletion || deleteMediaMutation.isPending}
            >
              {deleteMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pašalinama...
                </>
              ) : (
                'Ištrinti'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}




