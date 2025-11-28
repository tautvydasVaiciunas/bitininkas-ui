import { useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api, { AssignmentAnalyticsStatus } from "@/lib/api";
import { mapGroupFromApi, mapTaskFromApi } from "@/lib/types";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import type { AssignmentReportItem, Group, Task } from "@/lib/types";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";

const statusOptions: { label: string; value: AssignmentAnalyticsStatus }[] = [
  { label: "Visos", value: "all" },
  { label: "Laukiama", value: "waiting" },
  { label: "Vykdoma", value: "active" },
  { label: "Vėluoja", value: "overdue" },
  { label: "Užbaigta", value: "completed" },
];

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDayLabel = (value: string | undefined | null) =>
  value ? new Date(value).toLocaleDateString("lt-LT") : "—";

const getMonthDays = (value: Date) => {
  const days = [];
  const year = value.getFullYear();
  const month = value.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

type CalendarFilters = {
  groupId: string;
  taskId: string;
  status: AssignmentAnalyticsStatus;
  month: string;
};

const defaultFilters: CalendarFilters = {
  groupId: "",
  taskId: "",
  status: "all",
  month: formatIsoDate(new Date()),
};

const buildAssignmentsKey = (filters: CalendarFilters) => [
  "reports",
  "assignments",
  filters.groupId,
  filters.taskId,
  filters.status,
  filters.month,
];

export default function ReportsCalendar() {
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useQuery<Group[]>({
    queryKey: ["groups", "reports", "calendar"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery<Task[]>({
    queryKey: ["tasks", "reports", "calendar"],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const parsedMonth = useMemo(() => {
    const [year, month] = filters.month.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }, [filters.month]);

  const monthStart = formatIsoDate(parsedMonth);
  const monthEnd = formatIsoDate(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 0));

  const { data: assignments = [], isLoading, isError } = useQuery<AssignmentReportItem[]>({
    queryKey: buildAssignmentsKey(filters),
    enabled: Boolean(filters.groupId),
    queryFn: () =>
      api.reports.assignments({
        groupId: filters.groupId,
        taskId: filters.taskId || undefined,
        status: filters.status,
        dateFrom: monthStart,
        dateTo: monthEnd,
      }),
  });

  const monthDays = useMemo(() => getMonthDays(parsedMonth), [parsedMonth]);

  const buildDayStats = useMemo(() => {
    const stats: Record<string, { starts: number; ends: number }> = {};
    assignments.forEach((assignment) => {
      const startDate = assignment.startDate?.slice(0, 10);
      const dueDate = assignment.dueDate?.slice(0, 10);
      if (startDate) {
        stats[startDate] = { ...(stats[startDate] ?? { starts: 0, ends: 0 }) };
        stats[startDate].starts += 1;
      }
      if (dueDate) {
        stats[dueDate] = { ...(stats[dueDate] ?? { starts: 0, ends: 0 }) };
        stats[dueDate].ends += 1;
      }
    });
    return stats;
  }, [assignments]);

  const selectedAssignments = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return assignments.filter(
      (assignment) =>
        assignment.startDate?.startsWith(selectedDate) ||
        assignment.dueDate?.startsWith(selectedDate),
    );
  }, [assignments, selectedDate]);

  const nextMonth = () => {
    const next = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1);
    setFilters((prev) => ({ ...prev, month: formatIsoDate(next) }));
  };

  const prevMonth = () => {
    const prev = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() - 1, 1);
    setFilters((prev) => ({ ...prev, month: formatIsoDate(prev) }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSelectedDate(null);
  };

  return (
    <MainLayout>
      {canView ? (
        <div className="space-y-6">
          <ReportsTabs />
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Kalendorius</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="calendar-group-select">
                    Grupė
                  </label>
                  <Select
                    id="calendar-group-select"
                    value={filters.groupId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, groupId: value }))}
                    disabled={groupsLoading || groupsError}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visos grupės" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Visos grupės</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="calendar-task-select">
                    Užduotis
                  </label>
                  <Select
                    id="calendar-task-select"
                    value={filters.taskId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, taskId: value }))}
                    disabled={tasksLoading || tasksError}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visos užduotys" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Visos užduotys</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="calendar-status-select">
                    Būsena
                  </label>
                  <Select
                    id="calendar-status-select"
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value as AssignmentAnalyticsStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visos" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mėnuo</label>
                  <div className="flex items-stretch gap-2">
                    <Button variant="outline" onClick={prevMonth}>
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 rounded-lg border border-border px-3 py-2 text-center font-semibold">
                      {parsedMonth.toLocaleDateString("lt-LT", {
                        year: "numeric",
                        month: "long",
                      })}
                    </div>
                    <Button variant="outline" onClick={nextMonth}>
                      <CalendarDays className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Išvalyti filtrus
                </Button>
              </div>
              {(groupsError || tasksError) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Įvyko klaida</AlertTitle>
                  <AlertDescription>
                    Nepavyko įkelti filtrų duomenų. Bandykite perkrauti puslapį.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Kalendorius</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                {["Sek", "Pir", "Ant", "Tre", "Ket", "Penk", "Šeš"].map((label) => (
                  <div key={label} className="text-center">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[80px]" />;
                  }
                  const iso = formatIsoDate(day);
                  const stats = buildDayStats[iso] ?? { starts: 0, ends: 0 };
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDate(iso)}
                      className={cn(
                        "flex min-h-[80px] flex-col rounded-lg border p-2 text-left transition-shadow hover:shadow",
                        isSelected ? "border-foreground bg-foreground/10" : "border-border",
                      )}
                    >
                      <div className="text-sm font-semibold">{day.getDate()}</div>
                      <div className="mt-1 space-y-1 text-[0.65rem]">
                        <div className="flex items-center justify-between">
                          <span>Pradžia</span>
                          <Badge variant="outline">{stats.starts}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Pabaiga</span>
                          <Badge variant="outline">{stats.ends}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>
                  {formatShortDate(selectedDate)} — Užduotys
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : isError ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Duomenų nepavyko įkelti</AlertTitle>
                    <AlertDescription>Patikrinkite filtrus.</AlertDescription>
                  </Alert>
                ) : !selectedAssignments.length ? (
                  <p className="text-muted-foreground">Nėra priskirtų užduočių šiai dienai.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Užduotis</th>
                          <th className="px-3 py-2 text-left">Avilys</th>
                          <th className="px-3 py-2 text-left">Vartotojas</th>
                          <th className="px-3 py-2 text-left">Būsena</th>
                          <th className="px-3 py-2 text-left">Žingsniai</th>
                          <th className="px-3 py-2 text-left">Progressas</th>
                          <th className="px-3 py-2 text-left">Veiksmai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAssignments.map((row) => {
                          const stepsLabel =
                            row.totalSteps > 0
                              ? `${row.completedSteps} / ${row.totalSteps}`
                              : row.completedSteps > 0
                              ? `${row.completedSteps}`
                              : "—";
                          const progress =
                            row.totalSteps > 0
                              ? Math.round((row.completedSteps / row.totalSteps) * 100)
                              : 0;
                          return (
                            <tr key={`${row.assignmentId}-${row.taskId}`} className="border-t border-border">
                              <td className="px-3 py-3 font-medium">{row.taskTitle}</td>
                              <td className="px-3 py-3">{row.hiveLabel}</td>
                              <td className="px-3 py-3">{row.userName}</td>
                              <td className="px-3 py-3">
                                <AssignmentStatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-3">{stepsLabel}</td>
                              <td className="px-3 py-3">
                                <Progress value={progress} className="h-2" />
                              </td>
                              <td className="px-3 py-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={`/tasks/${row.assignmentId}/run`}>Peržiūrėti</a>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Prieiga ribojama</AlertTitle>
          <AlertDescription>
            Ataskaitas gali peržiūrėti tik vadybininkai ir administratoriai.
          </AlertDescription>
        </Alert>
      )}
    </MainLayout>
  );
}
