import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import { mapTaskFromApi, type CreateTaskPayload, type Task, type TaskFrequency } from '@/lib/types';

const messages = ltMessages.tasks;

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

type CreateTaskFormState = {
  title: string;
  description: string;
  category: string;
  frequency: TaskFrequency;
  defaultDueDays: string;
  seasonMonths: number[];
};

const adminTasksQueryKey = ['tasks', 'admin', 'overview'] as const;

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const buildDefaultFormState = (): CreateTaskFormState => ({
    title: '',
    description: '',
    category: '',
    frequency: 'once',
    defaultDueDays: '7',
    seasonMonths: [],
  });
  const [createForm, setCreateForm] = useState<CreateTaskFormState>(buildDefaultFormState);

  const resetCreateForm = () => {
    setCreateForm(buildDefaultFormState());
  };

  const invalidateTaskQueries = () => {
    void queryClient.invalidateQueries({ queryKey: adminTasksQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks', 'for-steps'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks', 'for-templates'] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const response = await api.tasks.create(payload);
      return mapTaskFromApi(response);
    },
    onSuccess: (createdTask) => {
      toast.success(messages.createSuccess);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      queryClient.setQueryData<Task[]>(adminTasksQueryKey, (current = []) => {
        const withoutDuplicate = current.filter((task) => task.id !== createdTask.id);
        return [...withoutDuplicate, createdTask].sort((a, b) => a.title.localeCompare(b.title));
      });
      invalidateTaskQueries();
    },
    onError: (error) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.createError);
    },
  });

  const toggleSeasonMonth = (value: number, checked: boolean) => {
    setCreateForm((prev) => {
      const seasonMonths = checked
        ? Array.from(new Set([...prev.seasonMonths, value])).sort((a, b) => a - b)
        : prev.seasonMonths.filter((month) => month !== value);
      return { ...prev, seasonMonths };
    });
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast.error('Įveskite užduoties pavadinimą');
      return;
    }

    const parsedDueDays = Number(createForm.defaultDueDays);
    if (!Number.isFinite(parsedDueDays) || parsedDueDays <= 0) {
      toast.error('Įveskite galiojantį numatytą terminą');
      return;
    }

    const payload: CreateTaskPayload = {
      title: trimmedTitle,
      description: createForm.description.trim() || undefined,
      category: createForm.category.trim() || undefined,
      frequency: createForm.frequency,
      defaultDueDays: parsedDueDays,
      seasonMonths: createForm.seasonMonths,
    };

    await createMutation.mutateAsync(payload);
  };

  const { data: tasks = [], isLoading, isError } = useQuery<Task[]>({
    queryKey: adminTasksQueryKey,
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description?.toLowerCase().includes(normalizedQuery) ?? false);
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [tasks, searchQuery, categoryFilter]);

  const getFrequencyLabel = (frequency: Task['frequency']) => {
    const labels: Record<Task['frequency'], string> = {
      once: 'Vienkartinė',
      weekly: 'Kas savaitę',
      monthly: 'Kas mėnesį',
      seasonal: 'Sezoninė',
    };
    return labels[frequency];
  };

  const formatSeason = (months: number[]) => {
    if (!months.length) return null;
    const formatter = new Intl.DateTimeFormat('lt-LT', { month: 'short' });
    return months
      .map((month) => {
        const date = new Date();
        date.setMonth(month - 1);
        return formatter.format(date);
      })
      .join(', ');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Užduotys</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių šablonus</p>
          </div>
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
              <Button disabled={createMutation.isLoading}>
                {createMutation.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 w-4 h-4" />
                )}
                {createMutation.isLoading ? 'Saugoma...' : 'Sukurti užduotį'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Nauja užduotis</DialogTitle>
                <DialogDescription>Užpildykite informaciją apie užduotį.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="task-title">Pavadinimas</Label>
                    <Input
                      id="task-title"
                      value={createForm.title}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Pvz., Patikrinti avilį"
                      disabled={createMutation.isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="task-description">Aprašymas</Label>
                    <Textarea
                      id="task-description"
                      value={createForm.description}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Trumpai aprašykite užduotį"
                      disabled={createMutation.isLoading}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-category">Kategorija</Label>
                    <Input
                      id="task-category"
                      value={createForm.category}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, category: event.target.value }))
                      }
                      placeholder="Pvz., Sezoninės priežiūros"
                      disabled={createMutation.isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dažnumas</Label>
                    <Select
                      value={createForm.frequency}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({ ...prev, frequency: value as TaskFrequency }))
                      }
                      disabled={createMutation.isLoading}
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
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, defaultDueDays: event.target.value }))
                      }
                      disabled={createMutation.isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sezoniniai mėnesiai</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {monthOptions.map((month) => {
                      const checked = createForm.seasonMonths.includes(month.value);
                      return (
                        <label
                          key={month.value}
                          htmlFor={`month-${month.value}`}
                          className="flex items-center gap-2 text-sm font-medium"
                        >
                          <Checkbox
                            id={`month-${month.value}`}
                            checked={checked}
                            onCheckedChange={(state) =>
                              toggleSeasonMonth(month.value, state === true)
                            }
                            disabled={createMutation.isLoading}
                          />
                          {month.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetCreateForm();
                      setIsCreateDialogOpen(false);
                    }}
                    disabled={createMutation.isLoading}
                  >
                    Atšaukti
                  </Button>
                  <Button type="submit" disabled={createMutation.isLoading}>
                    {createMutation.isLoading ? (
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
        </div>

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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Kategorija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visos kategorijos</SelectItem>
                  {[...new Set(tasks.map((task) => task.category).filter(Boolean))].map((category) => (
                    <SelectItem key={category as string} value={category as string}>
                      {category as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-muted-foreground">Kraunama...</CardContent>
          </Card>
        ) : isError ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center text-destructive">Nepavyko įkelti užduočių.</CardContent>
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
              const seasonLabel = formatSeason(task.seasonMonths);

              return (
                <Card key={task.id} className="shadow-custom hover:shadow-custom-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                          {task.category && <Badge variant="secondary">{task.category}</Badge>}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Dažnis:</span>{' '}
                            <span className="font-medium">{getFrequencyLabel(task.frequency)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Numatytas terminas:</span>{' '}
                            <span className="font-medium">{task.defaultDueDays} d.</span>
                          </div>
                        </div>

                        {seasonLabel && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sezonas:</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {seasonLabel}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 w-4 h-4" />
                          Redaguoti
                        </Button>
                        <Button variant="outline" size="sm">
                          <Archive className="mr-2 w-4 h-4" />
                          Archyvuoti
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
