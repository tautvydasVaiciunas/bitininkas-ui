import { ChangeEvent, RefObject, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveMedia } from '@/components/media/ResponsiveMedia';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Star, X } from 'lucide-react';
import { SupportLightbox } from '@/components/support/SupportLightbox';
import {
  AssignmentStepMediaResponse,
  AssignmentStatus,
  StepProgress,
  TaskStep,
  TaskStepMediaType,
} from '@/lib/types';
import { formatDateIsoOr } from '@/lib/date';

export interface TaskExecutionLayoutProps {
  title: string;
  hiveLabel?: string | null;
  dueDate?: string | null;
  status: AssignmentStatus;
  progressPercent: number;
  steps: TaskStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  completedStepIds: Set<string>;
  lastCompletedStepIndex: number;
  currentStep?: TaskStep;
  currentProgress?: StepProgress;
  currentMediaUrl: string | null;
  currentMediaType: TaskStepMediaType | null;
  requiresUserMedia: boolean;
  existingMedia: AssignmentStepMediaResponse[];
  hasUploadedMedia: boolean;
  stepNotes?: string;
  onStepNotesChange?: (value: string) => void;
  stepNotesDisabled?: boolean;
  onRemoveMedia?: (media: AssignmentStepMediaResponse) => void;
  removeMediaPending?: boolean;
  mediaError?: string | null; 
  selectedMediaFileName?: string | null;
  uploadPending: boolean;
  mediaInputRef?: RefObject<HTMLInputElement>;
  cameraInputRef?: RefObject<HTMLInputElement>;
  onUploadClick?: () => void;
  onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  isRatingStep: boolean;
  ratingValue: number | null;
  ratingComment: string;
  onRatingChange: (value: number) => void;
  onRatingCommentChange: (value: string) => void;
  canSubmitRating: boolean;
  ratingSubmitPending: boolean;
  onSubmitRating: () => void;
  ratingLockMessage?: string | null;
  hasRated: boolean;
  handlePrevStep: () => void;
  handleNextStep: () => void;
  currentStepNumber: number;
  totalStepsCount: number;
  hasCurrentStepCompleted: boolean;
  onStepComplete: () => void;
  onStepUncomplete: () => void;
  toggleStepPending: boolean;
  canUncompleteCurrentStep: boolean;
  previewMode?: boolean;
  assignmentRating?: number | null;
}

export function TaskExecutionLayout(props: TaskExecutionLayoutProps) {
  const [isStepImagePreviewOpen, setIsStepImagePreviewOpen] = useState(false);

  const {
    title,
    hiveLabel,
    dueDate,
    status,
    progressPercent,
    steps,
    currentStepIndex,
    setCurrentStepIndex,
    completedStepIds,
    lastCompletedStepIndex,
    currentStep,
    currentProgress,
    currentMediaUrl,
    currentMediaType,
    requiresUserMedia,
    existingMedia,
    hasUploadedMedia,
    stepNotes,
    onStepNotesChange,
    stepNotesDisabled = false,
    mediaError,
    selectedMediaFileName,
    uploadPending,
    mediaInputRef,
    cameraInputRef,
    onRemoveMedia,
    removeMediaPending,
    onUploadClick,
    onFileChange,
    isRatingStep,
    ratingValue,
    ratingComment,
    onRatingChange,
    onRatingCommentChange,
    canSubmitRating,
    ratingSubmitPending,
    onSubmitRating,
    ratingLockMessage = null,
    hasRated,
    handlePrevStep,
    handleNextStep,
    currentStepNumber,
    totalStepsCount,
    hasCurrentStepCompleted,
    onStepComplete,
    onStepUncomplete,
    toggleStepPending,
    canUncompleteCurrentStep,
    previewMode = false,
    assignmentRating,
  } = props;

  const canPreviewCurrentImage = Boolean(currentMediaUrl && currentMediaType === 'image');

  useEffect(() => {
    setIsStepImagePreviewOpen(false);
  }, [currentStep?.id]);

  const maxSelectable = previewMode
    ? steps.length - 1
    : Math.min(steps.length - 1, lastCompletedStepIndex + 1);

  const isActionDisabled = previewMode;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-3 text-sm md:text-base">
            <span>Avilys: {hiveLabel ?? 'Nežinomas'}</span>
            <span className="hidden md:inline">-</span>
            <span>Terminas: {formatDateIsoOr(dueDate)}</span>
          </p>
        </div>
        <AssignmentStatusBadge status={status} dueDate={dueDate} />
      </div>

      <Card className="shadow-custom">
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Užduoties progresas</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="order-2 lg:order-1">
          <Card className="shadow-custom h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Žingsniai</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = completedStepIds.has(step.id);
                const isActive = index === currentStepIndex;
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
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
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
        </div>

        <div className="flex flex-col gap-6 lg:col-span-3 order-1 lg:order-2 min-h-0">
          <Card className="shadow-custom flex-1">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">
                    {isRatingStep ? 'Paskutinis žingsnis' : `Žingsnis ${currentStepIndex + 1} iš ${steps.length}`}
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
            <CardContent className="space-y-6 flex flex-col gap-6">
              {isRatingStep ? (
                <div className="space-y-6">
                  <p className="text-foreground">
                    Mums svarbi jusu nuomone – ar užduotis buvo aiški? Ka galetume aprašyti geriau? Ivertinkite ir padekite mums tobuleti.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vertinimas nera privalomas: administratoriui užduotis matoma ir be jo.
                  </p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const isActiveStar = ratingValue !== null && ratingValue >= value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (!previewMode) {
                              onRatingChange(value);
                            }
                          }}
                          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          aria-label={`${value} žvaigždutes`}
                          disabled={previewMode}
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
                    <Label htmlFor="ratingComment">Komentaras (neprivalomas)</Label>
                    <Textarea
                      id="ratingComment"
                      value={ratingComment}
                      placeholder="Palikite savo pastabas apie užduoti..."
                      rows={4}
                      onChange={(event) => {
                        if (!previewMode) {
                          onRatingCommentChange(event.target.value);
                        }
                      }}
                      disabled={previewMode}
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
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                    Pereidami pirmyn arba atgal tik peržiurite žingsnius. Žingsnis laikomas atliktu tik paspaudus
                    „Atlikta“.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`step-notes-${currentStep?.id ?? 'current'}`}>
                      Komentaras (neprivalomas)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Nebutina pildyti. Irašykite tik jei norite palikti pastaba administratoriui.
                    </p>
                    <Textarea
                      id={`step-notes-${currentStep?.id ?? 'current'}`}
                      value={stepNotes ?? ''}
                      placeholder="Pvz.: šiame avilyje pastebejau..."
                      rows={3}
                      onChange={(event) => {
                        if (!previewMode) {
                          onStepNotesChange?.(event.target.value);
                        }
                      }}
                      disabled={previewMode || stepNotesDisabled}
                    />
                  </div>
                  {currentMediaUrl ? (
                    <div className="rounded-2xl border border-muted/40 bg-muted/10 p-4 min-h-[220px]">
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="w-full max-w-[640px]">
                          {canPreviewCurrentImage ? (
                            <button
                              type="button"
                              onClick={() => setIsStepImagePreviewOpen(true)}
                              className="w-full cursor-zoom-in"
                              aria-label="Atidaryti nuotrauką didesnei peržiūrai"
                            >
                              <ResponsiveMedia
                                url={currentMediaUrl}
                                type={currentMediaType}
                                title={currentStep?.title ?? 'Žingsnis'}
                                className="h-[220px] w-full rounded-xl"
                                fit="contain"
                              />
                            </button>
                          ) : (
                            <ResponsiveMedia
                              url={currentMediaUrl}
                              type={currentMediaType}
                              title={currentStep?.title ?? 'Žingsnis'}
                              className="h-[220px] w-full rounded-xl"
                              fit="contain"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {requiresUserMedia ? (
                    <>
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-50 text-amber-700">
                        Šiam žingsniui reikalinga jusu nuotrauka arba vaizdo irašas
                      </Badge>
                      <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onUploadClick}
                          disabled={previewMode || uploadPending}
                        >
                          Ikelti nuotrauka / vaizdo iraša
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cameraInputRef?.current?.click()}
                          disabled={previewMode || uploadPending}
                        >
                          Fotografuoti
                        </Button>
                        {!previewMode && mediaInputRef ? (
                          <input
                            ref={mediaInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={onFileChange}
                          />
                        ) : null}
                        {!previewMode ? (
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={onFileChange}
                          />
                        ) : null}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {uploadPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Ikeliama...
                              </>
                            ) : selectedMediaFileName ? (
                              <>Pasirinkta: {selectedMediaFileName}</>
                            ) : hasUploadedMedia ? (
                              <>
                                {existingMedia.length === 1
                                  ? '1 failas ikeltas'
                                  : `${existingMedia.length} failai ikelti`}
                              </>
                            ) : (
                              'Pasirinkite faila, kad galetumete pažymeti žingsni'
                            )}
                          </div>
                        </div>
                        {mediaError ? (
                          <p className="text-sm text-destructive" role="alert">
                            {mediaError}
                          </p>
                        ) : null}
                        {hasUploadedMedia && existingMedia.length ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-foreground">Ikelti failai</p>
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
                                    <div className="relative">
                                      <ResponsiveMedia
                                        url={item.url}
                                        type={item.kind === 'video' ? 'video' : 'image'}
                                        title={currentStep?.title ?? 'Žingsnis'}
                                        className="h-36 aspect-auto"
                                        fit="contain"
                                      />
                                      {onRemoveMedia ? (
                                        <button
                                          type="button"
                                          onClick={() => onRemoveMedia(item)}
                                          disabled={removeMediaPending}
                                          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Ikelta {formatDateIsoOr(item.createdAt)}
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
                  onClick={onSubmitRating}
                  disabled={previewMode || !canSubmitRating || ratingSubmitPending}
                >
                  {ratingSubmitPending
                    ? 'Siunciama...'
                    : hasRated
                    ? 'Vertinimas išsaugotas'
                    : 'Siusti vertinima'}
                </Button>
                {assignmentRating ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Jusu paskutinis ivertinimas: {assignmentRating} / 5
                  </p>
                ) : null}
                {ratingLockMessage ? (
                  <p className="text-center text-sm text-amber-700">{ratingLockMessage}</p>
                ) : null}
              </div>
            ) : (
              <div>
                {hasCurrentStepCompleted ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={onStepUncomplete}
                    disabled={previewMode || !canUncompleteCurrentStep || toggleStepPending}
                  >
                    {toggleStepPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gražinama...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Pažymeti kaip neatlikta
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={onStepComplete}
                    disabled={
                      previewMode ||
                      toggleStepPending ||
                      (requiresUserMedia && !hasUploadedMedia)
                    }
                    title={
                      requiresUserMedia && !hasUploadedMedia
                        ? 'Ikelkite nuotrauka arba vaizdo iraša, kad galetumete pažymeti žingsni'
                        : undefined
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {toggleStepPending ? 'Žymima...' : 'Atlikta'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {canPreviewCurrentImage && currentMediaUrl ? (
        <SupportLightbox
          imageUrl={currentMediaUrl}
          open={isStepImagePreviewOpen}
          onClose={() => setIsStepImagePreviewOpen(false)}
          showDownload
        />
      ) : null}
    </div>
  );
}


