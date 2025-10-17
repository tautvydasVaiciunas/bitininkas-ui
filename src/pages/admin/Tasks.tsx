import { FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
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
  type TaskFrequency,
  type Template,
  type UpdateTaskPayload,
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

type EditFormStep = {
  id?: string;
  title: string;
  contentText: string;
};

const buildDefaultEditFormState = () => {
  const steps: EditFormStep[] = [{ title: '', contentText: '' }];
  return {
    title: '',
    description: '',
    category: '',
    frequency: 'once' as TaskFrequency,
    defaultDueDays: '7',
    seasonMonths: [] as number[],
    steps,
  };
};

type EditTaskFormState = ReturnType<typeof buildDefaultEditFormState>;

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAssignmentFormState>(buildDefaultFormState);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const [editForm, setEditForm] = useState<EditTaskFormState>(buildDefaultEditFormState);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

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

  const resetEditForm = () => {
    setEditForm(buildDefaultEditFormState());
    setEditingTaskId(null);
    editingTaskIdRef.current = null;
    setIsLoadingEditData(false);
  };

  const invalidateQueries = () => {
    void queryClient.invalidateQueries({ queryKey: adminTasksQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleOpenEditDialog = (task: Task) => {
    const taskId = task.id;
    setEditingTaskId(taskId);
    editingTaskIdRef.current = taskId;
    setIsEditDialogOpen(true);
    setIsLoadingEditData(true);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      category: task.category ?? '',
      frequency: task.frequency,
      defaultDueDays: String(task.defaultDueDays),
      seasonMonths: Array.isArray(task.seasonMonths)
        ? [...task.seasonMonths].sort((a, b) => a - b)
        : [],
      steps: [{ title: '', contentText: '' }],
    });

    void (async () => {
      try {
        const response = await api.tasks.getSteps(taskId);
        const sortedSteps = [...response].sort((a, b) => a.orderIndex - b.orderIndex);
        const mappedSteps: EditFormStep[] = sortedSteps.map((step) => ({
          id: step.id,
          title: step.title,
          contentText: step.contentText ?? '',
        }));

        if (editingTaskIdRef.current !== taskId) {
          return;
        }

        setEditForm((previous) => ({
          ...previous,
          steps: mappedSteps.length > 0 ? mappedSteps : [{ title: '', contentText: '' }],
        }));
      } catch (error) {
        if (editingTaskIdRef.current !== taskId) {
          return;
        }
        console.error('Failed to load task steps', error);
        toast.error('Nepavyko įkelti užduoties žingsnių.');
        setEditForm((previous) => ({
          ...previous,
          steps: previous.steps.length > 0 ? previous.steps : [{ title: '', contentText: '' }],
        }));
      } finally {
        if (editingTaskIdRef.current === taskId) {
          setIsLoadingEditData(false);
        }
      }
    })();
  };

  const handleToggleEditSeasonMonth = (month: number, checked: boolean) => {
    setEditForm((prev) => {
      const nextMonths = checked
        ? Array.from(new Set([...prev.seasonMonths, month]))
        : prev.seasonMonths.filter((value) => value !== month);
      nextMonths.sort((a, b) => a - b);
      return { ...prev, seasonMonths: nextMonths };
    });
  };

  const addEditStep = () => {
    setEditForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { title: '', contentText: '' }],
    }));
  };

  const updateEditStep = (index: number, changes: Partial<EditFormStep>) => {
    setEditForm((prev) => {
      const nextSteps = prev.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step,
      );
      return { ...prev, steps: nextSteps };
    });
  };

  const removeEditStep = (index: number) => {
    setEditForm((prev) => {
      if (prev.steps.length <= 1) {
        return prev;
      }
      const nextSteps = prev.steps.filter((_, stepIndex) => stepIndex !== index);
      return { ...prev, steps: nextSteps };
    });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const response = await api.tasks.update(id, payload);
      return mapTaskFromApi(response);
    },
    onSuccess: () => {
      toast.success(messages.updateSuccess);
      setIsEditDialogOpen(false);
      resetEditForm();
      invalidateQueries();
    },
    onError: (error: unknown) => {
      if (error instanceof HttpError) {
        toast.error(error.message);
        return;
      }
      toast.error(messages.updateError);
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

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingTaskId || updateMutation.isPending) {
      return;
    }

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      toast.error('Trūksta pavadinimo. Įveskite užduoties pavadinimą prieš išsaugant.');
      return;
    }

    const parsedDefaultDueDays = Number(editForm.defaultDueDays);
    if (!Number.isFinite(parsedDefaultDueDays) || parsedDefaultDueDays <= 0) {
      toast.error('Neteisingas termino laikas. Įveskite teigiamą dienų skaičių.');
      return;
    }

    const sanitizedSteps = editForm.steps
      .map((step) => ({
        title: step.title.trim(),
        contentText: step.contentText.trim(),
      }))
      .filter((step) => step.title.length > 0);

    if (sanitizedSteps.length === 0) {
      toast.error('Pridėkite bent vieną žingsnį. Užduotis turi turėti bent vieną žingsnį su pavadinimu.');
      return;
    }

    const seasonMonths = [...editForm.seasonMonths].sort((a, b) => a - b);

    const payload: UpdateTaskPayload = {
      title: trimmedTitle,
      description: editForm.description.trim() || undefined,
      category: editForm.category.trim() || undefined,
      frequency: editForm.frequency,
      defaultDueDays: parsedDefaultDueDays,
      seasonMonths: seasonMonths.length > 0 ? seasonMonths : undefined,
      steps: sanitizedSteps.map((step) => ({
        title: step.title,
        contentText: step.contentText || undefined,
      })),
    };

    await updateMutation.mutateAsync({ id: editingTaskId, payload });
  };

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === createForm.templateId),
    [templates, createForm.templateId],
  );

  const editFormDisabled = updateMutation.isPending || isLoadingEditData;

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
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetEditForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redaguoti užduotį</DialogTitle>
              <DialogDescription>Atnaujinkite užduoties informaciją.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-task-title">Pavadinimas</Label>
                  <Input
                    id="edit-task-title"
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Pvz., Pavasarinė apžiūra"
                    disabled={editFormDisabled}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-task-description">Aprašymas</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Trumpai aprašykite užduotį"
                    disabled={editFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-category">Kategorija</Label>
                  <Input
                    id="edit-task-category"
                    value={editForm.category}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="Pvz., Sezoninės priežiūros"
                    disabled={editFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-frequency">Dažnumas</Label>
                  <Select
                    value={editForm.frequency}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({ ...prev, frequency: value as TaskFrequency }))
                    }
                    disabled={editFormDisabled}
                  >
                    <SelectTrigger id="edit-task-frequency">
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
                  <Label htmlFor="edit-task-default-due">Numatytasis terminas (dienomis)</Label>
                  <Input
                    id="edit-task-default-due"
                    type="number"
                    min={1}
                    value={editForm.defaultDueDays}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, defaultDueDays: event.target.value }))
                    }
                    disabled={editFormDisabled}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sezoniniai mėnesiai</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {monthOptions.map((month) => {
                    const checked = editForm.seasonMonths.includes(month.value);
                    return (
                      <label key={month.value} className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) =>
                            handleToggleEditSeasonMonth(month.value, state === true)
                          }
                          disabled={editFormDisabled}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addEditStep}
                    disabled={editFormDisabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Pridėti žingsnį
                  </Button>
                </div>
                {isLoadingEditData && (
                  <p className="text-sm text-muted-foreground">Įkeliami užduoties žingsniai...</p>
                )}
                <div className="space-y-3">
                  {editForm.steps.map((step, index) => (
                    <div key={step.id ?? index} className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Žingsnis {index + 1}</h4>
                        {editForm.steps.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEditStep(index)}
                            disabled={editFormDisabled}
                            aria-label={`Pašalinti ${index + 1}-ą žingsnį`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-step-title-${index}`}>Pavadinimas</Label>
                        <Input
                          id={`edit-step-title-${index}`}
                          value={step.title}
                          onChange={(event) => updateEditStep(index, { title: event.target.value })}
                          disabled={editFormDisabled}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-step-description-${index}`}>Instrukcijos</Label>
                        <Textarea
                          id={`edit-step-description-${index}`}
                          value={step.contentText}
                          onChange={(event) =>
                            updateEditStep(index, { contentText: event.target.value })
                          }
                          placeholder="Aprašykite žingsnio veiksmus"
                          disabled={editFormDisabled}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetEditForm();
                  }}
                  disabled={updateMutation.isPending}
                >
                  Atšaukti
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || isLoadingEditData}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saugoma...
                    </>
                  ) : isLoadingEditData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kraunama...
                    </>
                  ) : (
                    'Išsaugoti'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                            {template.title}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(task)}
                          disabled={updateMutation.isPending}
                        >
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
