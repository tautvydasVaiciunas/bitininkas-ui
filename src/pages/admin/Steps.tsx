import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  mapTaskFromApi,
  mapTaskStepFromApi,
  type CreateTaskStepPayload,
  type Task,
  type TaskStep,
  type TaskStepMediaType,
} from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSteps() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [mediaType, setMediaType] = useState<TaskStepMediaType | ''>('');
  const [requireUserMedia, setRequireUserMedia] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: steps = [], isLoading, isError } = useQuery<TaskStep[]>({
    queryKey: ['tasks', selectedTaskId, 'steps'],
    queryFn: () => api.tasks.getSteps(selectedTaskId!).then((response) => response.map(mapTaskStepFromApi)),
    enabled: !!selectedTaskId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskStepPayload) => api.tasks.createStep(selectedTaskId!, payload),
    onSuccess: () => {
      toast.success('Žingsnis sukurtas');
      setShowForm(false);
      setMediaType('');
      setRequireUserMedia(false);
      void queryClient.invalidateQueries({ queryKey: ['tasks', selectedTaskId, 'steps'] });
    },
    onError: () => {
      toast.error('Nepavyko sukurti žingsnio');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (stepId: string) => api.tasks.deleteStep(selectedTaskId!, stepId),
    onSuccess: () => {
      toast.success('Žingsnis ištrintas');
      void queryClient.invalidateQueries({ queryKey: ['tasks', selectedTaskId, 'steps'] });
    },
    onError: () => {
      toast.error('Nepavyko ištrinti žingsnio');
    },
  });

  const filteredSteps = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return steps;
    return steps.filter((step) =>
      step.title.toLowerCase().includes(normalizedQuery) ||
      (step.contentText?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  }, [steps, searchQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const mediaUrl = String(formData.get('mediaUrl') ?? '').trim();

    if (!title || !selectedTaskId) {
      toast.error('Pasirinkite užduotį ir nurodykite pavadinimą');
      return;
    }

    event.currentTarget.reset();
    setMediaType('');
    setRequireUserMedia(false);
    const payload: CreateTaskStepPayload = {
      title,
      contentText: content || description || undefined,
    };

    if (mediaUrl) {
      payload.mediaUrl = mediaUrl;
    }

    if (mediaType) {
      payload.mediaType = mediaType;
    }

    payload.requireUserMedia = requireUserMedia;

    createMutation.mutate(payload);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių žingsnius</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} disabled={!selectedTaskId}>
            <Plus className="mr-2 w-4 h-4" />
            Pridėti žingsnį
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taskSelect">Pasirinkite užduotį</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
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

        {showForm && (
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Naujas žingsnis</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Pavadinimas <span className="text-destructive">*</span>
                    </Label>
                    <Input id="title" name="title" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Trumpas aprašymas</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="content">Turinys</Label>
                    <Textarea id="content" name="content" rows={4} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">Media nuoroda</Label>
                    <Input id="mediaUrl" name="mediaUrl" placeholder="https://..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Media tipas</Label>
                    <Select
                      value={mediaType || undefined}
                      onValueChange={(value: TaskStepMediaType) => setMediaType(value)}
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
                      id="requireUserMedia"
                      checked={requireUserMedia}
                      onCheckedChange={(checked) => setRequireUserMedia(checked === true)}
                    />
                    <Label htmlFor="requireUserMedia" className="cursor-pointer">
                      Reikia vartotojo nuotraukos
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isLoading}>
                    {createMutation.isLoading ? 'Sukuriama...' : 'Sukurti'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Atšaukti
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti žingsnių..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTaskId ? (
              <div className="text-center py-12 text-muted-foreground">
                Pirmiausia pasirinkite užduotį
              </div>
            ) : isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Kraunama...</div>
            ) : isError ? (
              <div className="text-center py-12 text-destructive">Nepavyko įkelti žingsnių.</div>
            ) : filteredSteps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Šiai užduočiai žingsnių dar nėra
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSteps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    onDelete={() => deleteMutation.mutate(step.id)}
                    disableActions={deleteMutation.isLoading && deleteMutation.variables === step.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function StepCard({
  step,
  onDelete,
  disableActions,
}: {
  step: TaskStep;
  onDelete: () => void;
  disableActions: boolean;
}) {
  const mediaTypeLabel = step.mediaType === 'image' ? 'Nuotrauka' : step.mediaType === 'video' ? 'Vaizdo įrašas' : null;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <Badge variant="outline">#{step.orderIndex + 1}</Badge>
            </div>
            {step.contentText && (
              <p className="text-sm text-foreground mt-2 line-clamp-2">{step.contentText}</p>
            )}
            {(step.mediaUrl || mediaTypeLabel || step.requireUserMedia) && (
              <div className="flex flex-wrap gap-2 text-sm mt-3">
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
                {step.requireUserMedia && (
                  <Badge variant="secondary">Reikia vartotojo nuotraukos</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={disableActions}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
