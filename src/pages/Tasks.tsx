import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import api, { HttpError } from '@/lib/api';
import {
  mapAssignmentFromApi,
  mapHiveFromApi,
  mapTaskFromApi,
  type Assignment,
  type Hive,
  type Task,
  type TaskFrequency,
  type CreateTaskPayload,
} from '@/lib/types';
import { AssignmentStatusBadge } from '@/components/AssignmentStatusBadge';
import { assignmentStatusFilterOptions, resolveAssignmentUiStatus } from '@/lib/assignmentStatus';
import { Plus, Search, Calendar, Box, ChevronRight, ListTodo, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const monthOptions = [
  { value: 1, label: 'Sausis' },
  { value: 2, label: 'Vasaris' },
  { value: 3, label: 'Kovas' },
  { value: 4, label: 'Balandis' },
  { value: 5, label: 'Gegužė' },
  { value: 6, label: 'Birželis' },
  { value: 7, label: 'Liepa' },
  { value: 8, label: 'Rugpjūtis' },
  { value: 9, label: 'Rugsėjis' },
  { value: 10, label: 'Spalis' },
  { value: 11, label: 'Lapkritis' },
  { value: 12, label: 'Gruodis' },
];

const frequencyOptions: { value: TaskFrequency; label: string }[] = [
  { value: 'once', label: 'Vienkartinė' },
  { value: 'weekly', label: 'Kas savaitę' },
  { value: 'monthly', label: 'Kas mėnesį' },
  { value: 'seasonal', label: 'Sezoninė' },
];

type EditableStep = {
  title: string;
  contentText: string;
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: '',
    frequency: 'once' as TaskFrequency,
    defaultDueDays: '7',
    seasonMonths: [] as number[],
    steps: [{ title: '', contentText: '' } as EditableStep],
  });

  const isAdmin = user?.role === 'admin';
  const canManageTasks = user?.role === 'admin' || user?.role === 'manager';

  const resetCreateForm = () =>
    setCreateForm({
      title: '',
      description: '',
      category: '',
      frequency: 'once' as TaskFrequency,
      defaultDueDays: '7',
      seasonMonths: [],
      steps: [{ title: '', contentText: '' }],
    });

  const createTaskMutation = useMutation<Task, HttpError | Error, CreateTaskPayload>({
    mutationFn: (payload) => api.tasks.create(payload).then(mapTaskFromApi),
    onSuccess: (createdTask) => {
      toast({
        title: 'Užduotis sukurta',
        description: `Užduotis „${createdTask.title}“ sėkmingai išsaugota.`,
      });
      resetCreateForm();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assignments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: HttpError | Error) => {
      toast({
        title: 'Nepavyko sukurti užduoties',
        description: error instanceof Error ? error.message : 'Įvyko nenumatyta klaida',
        variant: 'destructive',
      });
    },
  });

  const toggleSeasonMonth = (month: number, checked: boolean) => {
    setCreateForm((prev) => {
      const months = checked
        ? Array.from(new Set([...prev.seasonMonths, month]))
        : prev.seasonMonths.filter((value) => value !== month);
      return { ...prev, seasonMonths: months };
    });
  };

  const updateStep = (index: number, changes: Partial<EditableStep>) => {
    setCreateForm((prev) => {
      const steps = prev.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step
      );
      return { ...prev, steps };
    });
  };

  const removeStep = (index: number) => {
    setCreateForm((prev) => {
      if (prev.steps.length === 1) {
        return { ...prev, steps: [{ title: '', contentText: '' }] };
      }
      const steps = prev.steps.filter((_, stepIndex) => stepIndex !== index);
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setCreateForm((prev) => ({ ...prev, steps: [...prev.steps, { title: '', contentText: '' }] }));
  };

  const handleCreateTaskSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createTaskMutation.isPending) return;

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast({
        title: 'Trūksta pavadinimo',
        description: 'Įveskite užduoties pavadinimą prieš išsaugant.',
        variant: 'destructive',
      });
      return;
    }

    const dueDays = Number(createForm.defaultDueDays);
    if (Number.isNaN(dueDays) || dueDays <= 0) {
      toast({
        title: 'Neteisingas termino laikas',
        description: 'Įveskite teigiamą dienų skaičių.',
        variant: 'destructive',
      });
      return;
    }

    const sanitizedSteps = createForm.steps
      .map((step) => ({
        title: step.title.trim(),
        contentText: step.contentText.trim(),
      }))
      .filter((step) => step.title.length > 0);

    if (sanitizedSteps.length === 0) {
      toast({
        title: 'Pridėkite bent vieną žingsnį',
        description: 'Užduotis turi turėti bent vieną žingsnį su pavadinimu.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CreateTaskPayload = {
      title: trimmedTitle,
      description: createForm.description.trim() || undefined,
      category: createForm.category.trim() || undefined,
      frequency: createForm.frequency,
      defaultDueDays: dueDays,
      seasonMonths: createForm.seasonMonths,
      steps: sanitizedSteps.map((step) => ({
        title: step.title,
        contentText: step.contentText || undefined,
      })),
    };

    if (payload.seasonMonths && payload.seasonMonths.length === 0) {
      delete payload.seasonMonths;
    }

    createTaskMutation.mutate(payload);
  };

  const { data, isLoading, isError } = useQuery<{
    assignments: Assignment[];
    hives: Hive[];
    tasks: Task[];
    completionMap: Record<string, number>;
  }>({
    queryKey: ['assignments', 'list'],
    queryFn: async () => {
      const assignments = (await api.assignments.list()).map(mapAssignmentFromApi);
      const [hivesResponse, tasksResponse] = await Promise.all([api.hives.list(), api.tasks.list()]);
      const hives = hivesResponse.map(mapHiveFromApi);
      const tasks = tasksResponse.map(mapTaskFromApi);
      const completionEntries = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const completion = await api.progress.assignmentCompletion(assignment.id);
            return [assignment.id, completion] as const;
          } catch (error) {
            console.error('Failed to fetch assignment completion', error);
            return [assignment.id, 0] as const;
          }
        })
      );

      return {
        assignments,
        hives,
        tasks,
        completionMap: Object.fromEntries(completionEntries) as Record<string, number>,
      };
    },
  });

  const assignmentItems = useMemo(() => {
    if (!data) return [];

    const hiveMap = new Map<string, Hive>(data.hives.map((hive) => [hive.id, hive]));
    const taskMap = new Map<string, Task>(data.tasks.map((task) => [task.id, task]));

    return data.assignments.map((assignment) => {
      const hive = hiveMap.get(assignment.hiveId);
      const task = taskMap.get(assignment.taskId);
      const completion = data.completionMap[assignment.id] ?? 0;

      return {
        assignment,
        hive,
        task,
        completion,
      };
    });
  }, [data]);

  const filteredAssignments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return assignmentItems.filter(({ assignment, task }) => {
      const matchesSearch =
        !normalizedQuery ||
        (task?.title?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (task?.description?.toLowerCase().includes(normalizedQuery) ?? false);

      const uiStatus = resolveAssignmentUiStatus(assignment.status, assignment.dueDate);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' ? uiStatus === 'overdue' : assignment.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [assignmentItems, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Užduotys</h1>
            <p className="text-muted-foreground mt-1">Valdykite savo bitininkystės užduotis</p>
          </div>
          {canManageTasks && (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  resetCreateForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 w-4 h-4" />
                  Sukurti užduotį
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nauja užduotis</DialogTitle>
                  <DialogDescription>Aprašykite užduotį ir jos žingsnius.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTaskSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="task-title">Pavadinimas</Label>
                      <Input
                        id="task-title"
                        value={createForm.title}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="task-description">Aprašymas</Label>
                      <Textarea
                        id="task-description"
                        value={createForm.description}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Trumpai aprašykite užduotį"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-category">Kategorija</Label>
                      <Input
                        id="task-category"
                        value={createForm.category}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="Pvz., Sezoninės priežiūros"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dažnumas</Label>
                      <Select
                        value={createForm.frequency}
                        onValueChange={(value) =>
                          setCreateForm((prev) => ({ ...prev, frequency: value as TaskFrequency }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pasirinkite dažnumą" />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-default-due">Numatytasis terminas (dienomis)</Label>
                      <Input
                        id="task-default-due"
                        type="number"
                        min={1}
                        value={createForm.defaultDueDays}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, defaultDueDays: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sezoniniai mėnesiai</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {monthOptions.map((month) => {
                        const checked = createForm.seasonMonths.includes(month.value);
                        return (
                          <label key={month.value} className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(state) => toggleSeasonMonth(month.value, state === true)}
                            />
                            {month.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Žingsniai</h3>
                      <Button type="button" variant="outline" onClick={addStep}>
                        <Plus className="mr-2 h-4 w-4" />
                        Pridėti žingsnį
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {createForm.steps.map((step, index) => (
                        <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Žingsnis {index + 1}</h4>
                            {createForm.steps.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStep(index)}
                                aria-label={`Pašalinti ${index + 1}-ą žingsnį`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`step-title-${index}`}>Pavadinimas</Label>
                            <Input
                              id={`step-title-${index}`}
                              value={step.title}
                              onChange={(event) => updateStep(index, { title: event.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`step-description-${index}`}>Instrukcijos</Label>
                            <Textarea
                              id={`step-description-${index}`}
                              value={step.contentText}
                              onChange={(event) => updateStep(index, { contentText: event.target.value })}
                              placeholder="Aprašykite žingsnio veiksmus"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetCreateForm();
                        setIsCreateDialogOpen(false);
                      }}
                      disabled={createTaskMutation.isPending}
                    >
                      Atšaukti
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saugoma...
                        </>
                      ) : (
                        'Išsaugoti'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Būsena" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentStatusFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {isLoading ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-muted-foreground">Kraunama...</CardContent>
          </Card>
        ) : isError ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-destructive">
              Nepavyko įkelti užduočių. Pabandykite dar kartą.
            </CardContent>
          </Card>
        ) : filteredAssignments.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nerasta užduočių</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Pabandykite pakeisti paieškos kriterijus'
                  : 'Šiuo metu nėra priskirtų užduočių'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map(({ assignment, hive, task, completion }) => (
              <Card key={assignment.id} className="shadow-custom hover:shadow-custom-md transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{task?.title ?? 'Nežinoma užduotis'}</h3>
                          <p className="text-sm text-muted-foreground">{task?.description ?? 'Aprašymas nepateiktas'}</p>
                        </div>
                        <AssignmentStatusBadge status={assignment.status} dueDate={assignment.dueDate} />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Avilys:</span>
                          <span className="font-medium">{hive?.label ?? 'Nežinomas avilys'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Terminas:</span>
                          <span className="font-medium">{formatDate(assignment.dueDate)}</span>
                          {resolveAssignmentUiStatus(assignment.status, assignment.dueDate) === 'overdue' && (
                            <Badge variant="destructive" className="ml-2">Vėluojama</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresas</span>
                          <span className="font-medium">{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-2" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/tasks/${assignment.id}`}>
                          Peržiūrėti
                        </Link>
                      </Button>
                        {assignment.status !== 'done' && (
                        <Button asChild size="sm">
                          <Link to={`/tasks/${assignment.id}/run`}>
                            Vykdyti
                            <ChevronRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
