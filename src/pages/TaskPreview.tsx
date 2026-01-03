import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskExecutionLayout } from '@/components/tasks/TaskExecutionLayout';
import api, { type HttpError } from '@/lib/api';
import { mapAssignmentDetailsFromApi, type AssignmentDetails } from '@/lib/types';
import { inferMediaType, resolveMediaUrl } from '@/lib/media';

export default function TaskPreview() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const query = useQuery<AssignmentDetails & { isActive: boolean }, HttpError | Error>({
    queryKey: ['assignments', assignmentId, 'preview'],
    queryFn: () => api.assignments.preview(assignmentId ?? ''),
    enabled: Boolean(assignmentId),
  });

  const assignmentDetails = useMemo(
    () => (query.data ? mapAssignmentDetailsFromApi(query.data) : null),
    [query.data],
  );
  const assignment = assignmentDetails?.assignment;
  const steps = useMemo(() => {
    if (!assignmentDetails) return [];
    return [...assignmentDetails.task.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [assignmentDetails]);

  const progressEntries = assignmentDetails?.progress ?? [];
  const progressMap = useMemo(
    () => new Map(progressEntries.map((entry) => [entry.taskStepId, entry])),
    [progressEntries],
  );
  const completedStepIds = useMemo(
    () =>
      new Set(
        progressEntries
          .filter((entry) => entry.status === 'completed')
          .map((entry) => entry.taskStepId),
      ),
    [progressEntries],
  );

  const lastCompletedStepIndex = useMemo(() => {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      if (completedStepIds.has(steps[index].id)) {
        return index;
      }
    }
    return -1;
  }, [steps, completedStepIds]);

  const currentStep = steps[currentStepIndex];
  const currentProgress = currentStep ? progressMap.get(currentStep.id) : undefined;
  const currentMediaUrl = resolveMediaUrl(currentStep?.mediaUrl ?? null);
  const currentMediaType = inferMediaType(currentStep?.mediaType ?? null, currentMediaUrl);
  const requiresUserMedia = currentStep?.requireUserMedia ?? false;
  const existingMedia = currentProgress?.media ?? [];
  const hasUploadedMedia = existingMedia.length > 0;

  const isRatingStep = currentStepIndex >= steps.length;
  const totalStepsCount = steps.length + 1;
  const currentStepNumber = Math.min(currentStepIndex + 1, totalStepsCount);
  const progressPercent = assignmentDetails?.completion ?? 0;
  const hasCurrentStepCompleted = Boolean(currentProgress?.status === 'completed');
  const canUncompleteCurrentStep =
    hasCurrentStepCompleted && currentStepIndex === lastCompletedStepIndex;

  const ratingValue = assignment?.rating ?? null;
  const ratingComment = assignment?.ratingComment ?? '';
  const hasRated = Boolean(assignment?.ratedAt);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [assignmentId]);

  useEffect(() => {
    setCurrentStepIndex((index) => Math.min(index, steps.length));
  }, [steps.length]);

  const handlePrevStep = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleNextStep = () => {
    setCurrentStepIndex((index) => Math.min(steps.length, index + 1));
  };

  const handleStepComplete = () => {};
  const handleStepUncomplete = () => {};
  const handleSubmitRating = () => {};

  if (query.isLoading) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (query.isError) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="space-y-4 p-6 text-center">
            <CardTitle className="text-lg">Užduotis nerasta</CardTitle>
            <p>Neleidžiama peržiūrėti šios užduoties.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/tasks')}>Grįžti į užduotis</Button>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (!assignment) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="space-y-4 p-6 text-center">
            <CardTitle className="text-lg">Užduotis nerasta</CardTitle>
            <p>Ši užduotis šiuo metu nepasiekiama.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/tasks')}>Grįžti į užduotis</Button>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TaskExecutionLayout
        title={assignmentDetails?.task.title ?? 'Užduotis'}
        hiveLabel={assignment.hiveId}
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
        mediaError={null}
        selectedMediaFileName={null}
        uploadPending={false}
        isRatingStep={isRatingStep}
        ratingValue={ratingValue}
        ratingComment={ratingComment}
        onRatingChange={() => {}}
        onRatingCommentChange={() => {}}
        canSubmitRating={false}
        ratingSubmitPending={false}
        onSubmitRating={handleSubmitRating}
        hasRated={hasRated}
        handlePrevStep={handlePrevStep}
        handleNextStep={handleNextStep}
        currentStepNumber={currentStepNumber}
        totalStepsCount={totalStepsCount}
        hasCurrentStepCompleted={hasCurrentStepCompleted}
        onStepComplete={handleStepComplete}
        onStepUncomplete={handleStepUncomplete}
        toggleStepPending={false}
        canUncompleteCurrentStep={canUncompleteCurrentStep}
        previewMode
        assignmentRating={ratingValue}
      />
    </MainLayout>
  );
}
