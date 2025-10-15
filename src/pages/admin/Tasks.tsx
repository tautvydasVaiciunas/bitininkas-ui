import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import ltMessages from '@/i18n/messages.lt.json';
import api, { HttpError } from '@/lib/api';
import {
  mapGroupFromApi,
  mapTaskFromApi,
  mapTemplateFromApi,
  type BulkAssignmentsFromTemplatePayload,
  type Group,
  type Task,
  type Template,
} from '@/lib/types';

const messages = ltMessages.tasks;

const adminTasksQueryKey = ['tasks', 'admin', 'overview'] as const;
const templatesQueryKey = ['templates'] as const;
const groupsQueryKey = ['groups'] as const;

const buildDefaultFormState = () => ({
  title: '',
  description: '',
  templateId: '',
  groupIds: [] as string[],
  startDate: '',
  dueDate: '',
  notify: true,
});

type CreateAssignmentFormState = ReturnType<typeof buildDefaultFormState>;

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAssignmentFormState>(buildDefaultFormState);

  const { data: templates = [], isLoading: areTemplatesLoading } = useQuery<Template[]>({
    queryKey: templatesQueryKey,
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const { data: groups = [], isLoading: areGroupsLoading } = useQuery<Group[]>({
    queryKey: groupsQueryKey,
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

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

  const resetCreateForm = () => {
    setCreateForm(buildDefaultFormState());
  };

  const invalidateQueries = () => {
    void queryClient.invalidateQueries({ queryKey: adminTasksQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: BulkAssignmentsFromTemplatePayload) => {
      return api.assignments.bulkFromTemplate(payload);
    },
    onSuccess: (result) => {
      toast.success(
        messages.bulkSuccess
          .replace('{count}', String(result.created))
          .replace('{groups}', String(result.groups)),
      );
      setIsCreateDialogOpen(false);
      resetCreateForm();
      invalidateQueries();
    },
    onError: (error) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.bulkError);
    },
  });

  const handleToggleGroup = (groupId: string, checked: boolean) => {
    setCreateForm((prev) => {
      const nextGroupIds = checked
        ? Array.from(new Set([...prev.groupIds, groupId]))
        : prev.groupIds.filter((id) => id !== groupId);
      return { ...prev, groupIds: nextGroupIds };
    });
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast.error(messages.validationTitle);
      return;
    }

    if (!createForm.templateId) {
      toast.error(messages.validationTemplate);
      return;
    }

    if (!createForm.groupIds.length) {
      toast.error(messages.validationGroups);
      return;
    }

    if (!createForm.startDate || !createForm.dueDate) {
      toast.error(messages.validationDatesRequired);
      return;
    }

    if (createForm.startDate > createForm.dueDate) {
      toast.error(messages.validationDateRange);
      return;
    }

    const payload: BulkAssignmentsFromTemplatePayload = {
      templateId: createForm.templateId,
      groupIds: createForm.groupIds,
      title: trimmedTitle,
      description: createForm.description.trim() || undefined,
      startDate: createForm.startDate,
      dueDate: createForm.dueDate,
      notify: createForm.notify,
    };

    await createMutation.mutateAsync(payload);
  };

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === createForm.templateId),
    [templates, createForm.templateId],
  );

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
        date.setUTCMonth(month - 1);
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
            <p className="text-muted-foreground mt-1">Priskirkite šablonus grupėms ir stebėkite eigą</p>
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Nauja užduotis</DialogTitle>
                <DialogDescription>
                  Pasirinkite šabloną ir priskirkite jį pasirinktų grupių aviliams.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="task-title">Pavadinimas</Label>
                    <Input
                      id="task-title"
                      value={createForm.title}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Pvz., Pavasarinė apžiūra"
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
                      placeholder="Trumpai aprašykite, ką turėtų atlikti bitininkai"
                      disabled={createMutation.isLoading}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Šablonas</Label>
                    <Select
                      value={createForm.templateId}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({ ...prev, templateId: value }))
                      }
                      disabled={
                        createMutation.isLoading ||
                        areTemplatesLoading ||
                        templates.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={messages.templatePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {areTemplatesLoading && (
                      <p className="text-sm text-muted-foreground">Įkeliami šablonai...</p>
                    )}
                    {!areTemplatesLoading && templates.length === 0 && (
                      <p className="text-sm text-destructive">Nėra sukurtų šablonų.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Grupės</Label>
                    <div className="rounded-md border">
                      <ScrollArea className="h-40">
                        <div className="p-3 space-y-2">
                          {areGroupsLoading ? (
                            <p className="text-sm text-muted-foreground">Įkeliamos grupės...</p>
                          ) : groups.length === 0 ? (
                            <p className="text-sm text-destructive">Nėra galimų grupių.</p>
                          ) : (
                            groups.map((group) => {
                              const checked = createForm.groupIds.includes(group.id);
                              return (
                                <label
                                  key={group.id}
                                  htmlFor={`group-${group.id}`}
                                  className="flex items-center gap-2 text-sm font-medium"
                                >
                                  <Checkbox
                                    id={`group-${group.id}`}
                                    checked={checked}
                                    onCheckedChange={(state) =>
                                      handleToggleGroup(group.id, state === true)
                                    }
                                    disabled={createMutation.isLoading}
                                  />
                                  <span>{group.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    {createForm.groupIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Pasirinkta grupių: {createForm.groupIds.length}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-start-date">Pradžios data</Label>
                    <Input
                      id="task-start-date"
                      type="date"
                      value={createForm.startDate}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                      disabled={createMutation.isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-due-date">Pabaigos data</Label>
                    <Input
                      id="task-due-date"
                      type="date"
                      value={createForm.dueDate}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                      disabled={createMutation.isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={createForm.notify}
                        onCheckedChange={(state) =>
                          setCreateForm((prev) => ({ ...prev, notify: state !== false }))
                        }
                        disabled={createMutation.isLoading}
                      />
                      <span>{messages.notifyLabel}</span>
                    </label>
                    <p className="text-xs text-muted-foreground">{messages.notifyHint}</p>
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <h3 className="font-semibold text-sm">Pasirinkto šablono informacija</h3>
                    <p className="text-sm text-muted-foreground">
                      Žingsnių skaičius: {selectedTemplate.steps.length}
                    </p>
                    {selectedTemplate.comment && (
                      <p className="text-sm text-muted-foreground">{selectedTemplate.comment}</p>
                    )}
                  </div>
                )}

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
                      'Sukurti'
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
