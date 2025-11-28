import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import api, { AssignmentAnalyticsStatus } from "@/lib/api";
import { mapGroupFromApi, mapTaskFromApi } from "@/lib/types";
import type {
  AssignmentAnalyticsResponse,
  AssignmentAnalyticsRow,
  Group,
  Task,
} from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { ReportsTabs } from "@/components/reports/ReportsTabs";

const analyticsStatusOptions: { label: string; value: AssignmentAnalyticsStatus }[] = [
  { value: "all", label: "Visos" },
  { value: "waiting", label: "Laukiama" },
  { value: "active", label: "Vykdoma" },
  { value: "completed", label: "Užbaigta" },
  { value: "overdue", label: "Vėluoja" },
];

const formatShortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("lt-LT") : "—";

type AnalyticsFilterState = {
  dateFrom: string;
  dateTo: string;
  taskId: string;
  status: AssignmentAnalyticsStatus;
  groupId: string;
  page: number;
  limit: number;
};

const defaultAnalyticsFilters: AnalyticsFilterState = {
  dateFrom: "",
  dateTo: "",
  taskId: "all",
  status: "all",
  groupId: "all",
  page: 1,
  limit: 20,
};

export default function ReportsAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilterState>(defaultAnalyticsFilters);

  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useQuery<Group[]>(() => ({
    queryKey: ["groups", "reports", "assignments"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  }));

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery<Task[]>(() => ({
    queryKey: ["tasks", "reports", "assignments"],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  }));

  const analyticsQuery = useQuery<AssignmentAnalyticsResponse>({
    queryKey: ["reports", "assignment-analytics", analyticsFilters],
    queryFn: () => {
      const taskIdParam =
        analyticsFilters.taskId && analyticsFilters.taskId !== "all"
          ? analyticsFilters.taskId
          : undefined;
      const groupIdParam =
        analyticsFilters.groupId && analyticsFilters.groupId !== "all"
          ? analyticsFilters.groupId
          : undefined;

      return api.reports.assignmentAnalytics({
        taskId: taskIdParam,
        groupId: groupIdParam,
        dateFrom: analyticsFilters.dateFrom || undefined,
        dateTo: analyticsFilters.dateTo || undefined,
        status: analyticsFilters.status,
        page: analyticsFilters.page,
        limit: analyticsFilters.limit,
      });
    },
    keepPreviousData: true,
  });

  const analyticsRows = analyticsQuery.data?.data ?? [];
  const analyticsSummary = analyticsQuery.data?.summary;
  const analyticsTotal = analyticsQuery.data?.total ?? 0;
  const analyticsTotalPages = Math.max(1, Math.ceil(analyticsTotal / analyticsFilters.limit));

  const updateAnalyticsCriteria = (
    patch: Partial<Omit<AnalyticsFilterState, "page" | "limit">>,
  ) => {
    setAnalyticsFilters((prev) => ({
      ...prev,
      ...patch,
      page: 1,
    }));
  };

  const goToAnalyticsPage = (page: number) => {
    setAnalyticsFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const resetFilters = () => {
    setAnalyticsFilters(defaultAnalyticsFilters);
  };

  const handleDrillDown = (taskId: string) => {
    if (!analyticsFilters.groupId || analyticsFilters.groupId === "all") {
      return;
    }

    const params = new URLSearchParams();
    params.set("taskId", taskId);
    params.set("groupId", analyticsFilters.groupId);
    if (analyticsFilters.dateFrom) {
      params.set("dateFrom", analyticsFilters.dateFrom);
    }
    if (analyticsFilters.dateTo) {
      params.set("dateTo", analyticsFilters.dateTo);
    }

    navigate(`/reports/hives?${params.toString()}`);
  };

  return (
    <MainLayout>
      <ReportsTabs />
      {canView ? (
        <div className="space-y-6">
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Užduočių analizė</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="analytics-date-from">
                    Laikotarpis nuo
                  </label>
                  <Input
                    id="analytics-date-from"
                    type="date"
                    value={analyticsFilters.dateFrom}
                    onChange={(event) =>
                      updateAnalyticsCriteria({ dateFrom: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="analytics-date-to">
                    iki
                  </label>
                  <Input
                    id="analytics-date-to"
                    type="date"
                    value={analyticsFilters.dateTo}
                    onChange={(event) =>
                      updateAnalyticsCriteria({ dateTo: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium" htmlFor="analytics-task-select">
                    Užduotis
                  </label>
                  <Select
                    value={analyticsFilters.taskId}
                    onValueChange={(value) => updateAnalyticsCriteria({ taskId: value })}
                    disabled={tasksLoading || tasksError}
                  >
                    <SelectTrigger id="analytics-task-select">
                      <SelectValue placeholder="Visos užduotys" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Visos užduotys</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="analytics-group-select">
                    Grupė
                  </label>
                  <Select
                    value={analyticsFilters.groupId}
                    onValueChange={(value) => updateAnalyticsCriteria({ groupId: value })}
                    disabled={groupsLoading || groupsError}
                  >
                    <SelectTrigger id="analytics-group-select">
                      <SelectValue placeholder="Visos grupės" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Visos grupės</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="analytics-status-select">
                    Būsena
                  </label>
                  <Select
                    value={analyticsFilters.status}
                    onValueChange={(value) =>
                      updateAnalyticsCriteria({ status: value as AssignmentAnalyticsStatus })
                    }
                  >
                    <SelectTrigger id="analytics-status-select">
                      <SelectValue placeholder="Visos" />
                    </SelectTrigger>
                    <SelectContent>
                      {analyticsStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <CardTitle>Analizės suvestinė</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Viso priskirta
                  </p>
                  <p className="text-2xl font-semibold">
                    {analyticsSummary?.total ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Užbaigta
                  </p>
                  <p className="text-2xl font-semibold">
                    {analyticsSummary?.completed ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Vidutinis įvertinimas
                  </p>
                  <p className="text-2xl font-semibold">
                    {analyticsSummary?.avgRating
                      ? analyticsSummary.avgRating.toFixed(1)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Vartotojų (pabaigė/visi)
                  </p>
                  <p className="text-2xl font-semibold">
                    {analyticsSummary?.completedUsers ?? 0}/
                    {analyticsSummary?.uniqueUsers ?? 0}
                  </p>
                </div>
              </div>

              {analyticsQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : analyticsQuery.isError ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Duomenų nepavyko įkelti</AlertTitle>
                  <AlertDescription>
                    Patikrinkite filtrus arba bandykite perkrauti puslapį.
                  </AlertDescription>
                </Alert>
              ) : analyticsRows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Užduotis</th>
                        <th className="px-3 py-2 text-left">Viso priskirta</th>
                        <th className="px-3 py-2 text-left">Baigta</th>
                        <th className="px-3 py-2 text-left">Vykdoma</th>
                        <th className="px-3 py-2 text-left">Laukiama</th>
                        <th className="px-3 py-2 text-left">Vėluoja</th>
                        <th className="px-3 py-2 text-left">Vidutinis įvertinimas</th>
                        <th className="px-3 py-2 text-left">Vartotojų (baigę/viso)</th>
                        <th className="px-3 py-2 text-left">Veiksmai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsRows.map((row) => (
                        <tr key={row.taskId} className="border-t border-border">
                          <td className="px-3 py-3 font-medium">{row.taskTitle}</td>
                          <td className="px-3 py-3">{row.assignedCount}</td>
                          <td className="px-3 py-3">{row.completedCount}</td>
                          <td className="px-3 py-3">{row.activeCount}</td>
                          <td className="px-3 py-3">{row.waitingCount}</td>
                          <td className="px-3 py-3">{row.overdueCount}</td>
                          <td className="px-3 py-3">
                            {row.avgRating ? row.avgRating.toFixed(1) : "—"}
                          </td>
                          <td className="px-3 py-3">
                            {row.completedUsers}/{row.uniqueUsers}
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={analyticsFilters.groupId === "all" || !analyticsFilters.groupId}
                              onClick={() => handleDrillDown(row.taskId)}
                            >
                              Peržiūrėti
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">Duomenų nerasta.</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Rodoma {analyticsRows.length} iš {analyticsTotal}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={analyticsFilters.page <= 1 || analyticsQuery.isLoading}
                    onClick={() => goToAnalyticsPage(analyticsFilters.page - 1)}
                  >
                    Ankstesnis
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      analyticsFilters.page >= analyticsTotalPages || analyticsQuery.isLoading
                    }
                    onClick={() => goToAnalyticsPage(analyticsFilters.page + 1)}
                  >
                    Sekantis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
