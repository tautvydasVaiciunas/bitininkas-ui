import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { mockAssignments } from '@/lib/mockData';
import { ChevronLeft, ChevronRight, CheckCircle2, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assignment = mockAssignments.find(a => a.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');

  if (!assignment) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Užduotis nerasta</h3>
            <p className="text-muted-foreground mb-6">Užduotis su šiuo ID neegzistuoja</p>
            <Button onClick={() => navigate('/tasks')}>Grįžti į užduotis</Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const steps = assignment.task.steps;
  const currentStep = steps[currentStepIndex];
  const progress = Math.round((completedSteps.size / steps.length) * 100);

  const handleStepComplete = () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStepIndex);
    setCompletedSteps(newCompleted);
    
    // TODO: call POST /progress/step-complete
    toast.success('Žingsnis pažymėtas kaip atliktas');

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setNotes('');
    } else {
      toast.success('Užduotis užbaigta!');
      setTimeout(() => navigate('/tasks'), 1500);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{assignment.task.name}</h1>
          <p className="text-muted-foreground">
            Avilys: {assignment.hive.name} | Progresas: {progress}%
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="shadow-custom">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bendras progresas</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Steps Sidebar */}
          <Card className="lg:col-span-1 shadow-custom h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Žingsniai</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    index === currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : completedSteps.has(index)
                      ? 'bg-success/10 text-success'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {completedSteps.has(index) ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                    )}
                    <span className="text-sm font-medium line-clamp-2">{step.title}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Current Step */}
            <Card className="shadow-custom">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      Žingsnis {currentStepIndex + 1} iš {steps.length}
                    </p>
                    <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
                  </div>
                  {completedSteps.has(currentStepIndex) && (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Aprašymas</h4>
                  <p className="text-muted-foreground">{currentStep.description}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Instrukcijos</h4>
                  <p className="text-foreground">{currentStep.contentText}</p>
                </div>

                {currentStep.requiresProof && (
                  <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
                    <div className="flex items-start gap-2">
                      <Image className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-warning-foreground">Reikalingas įrodymas</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Šiam žingsniui reikalinga nuotrauka ar įrašas
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Upload Stub */}
                {currentStep.requiresProof && (
                  <div className="space-y-2">
                    <Label>Įkelti {currentStep.mediaType === 'image' ? 'nuotrauką' : 'failą'}</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Spustelėkite arba nutempkite failą čia
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Pastabos (nebūtina)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Įveskite savo pastabas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="mr-2 w-4 h-4" />
                Atgal
              </Button>

              <div className="flex items-center gap-3">
                {!completedSteps.has(currentStepIndex) && (
                  <Button onClick={handleStepComplete}>
                    <CheckCircle2 className="mr-2 w-4 h-4" />
                    Pažymėti kaip atliktą
                  </Button>
                )}
                
                {currentStepIndex < steps.length - 1 && (
                  <Button variant="outline" onClick={handleNextStep}>
                    Kitas žingsnis
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
