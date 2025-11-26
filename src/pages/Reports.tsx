import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveMedia } from "@/components/media/ResponsiveMedia";
import api, { HttpError } from "@/lib/api";
import {
  mapAssignmentDetailsFromApi,
  mapGroupFromApi,
  mapTaskFromApi,
  type AssignmentAnalyticsResponse,
  type AssignmentAnalyticsRow,
  type AssignmentAnalyticsStatus,
  type AssignmentDetails,
  type AssignmentReportItem,
  type Group,
  type Task,
} from "@/lib/types";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { resolveAssignmentUiStatus } from "@/lib/assignmentStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AnalyticsFilterState = {
  dateFrom: string;
  dateTo: string;
  taskId: string;
  status: AssignmentAnalyticsStatus;
  groupId: string;
  page: number;
  limit: number;
};

const analyticsStatusOptions: { value: AssignmentAnalyticsStatus; label: string }[] = [
  { value: "all", label: "Visos" },
  { value: "active", label: "Vykdomos" },
  { value: "completed", label: "Užbaigtos" },
  { value: "overdue", label: "Vėluojamos" },
];

const formatShortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("lt-LT") : "—";

const defaultAnalyticsFilters: AnalyticsFilterState = {
  dateFrom: "",
  dateTo: "",
  taskId: "all",
  status: "all",
  groupId: "all",
  page: 1,
  limit: 20,
};

export default function Reports() {
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilterState>(
    defaultAnalyticsFilters,
  );
  const [selectedAnalyticsRow, setSelectedAnalyticsRow] = useState<AssignmentAnalyticsRow | null>(
    null,
  );

  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError,
  } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery<Task[]>({
    queryKey: ["tasks", "reports"],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const {
    data: assignmentReport = [],
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery<AssignmentReportItem[]>({
    queryKey: ["reports", "assignments", selectedGroupId, selectedTaskId],
    queryFn: () =>
      api.reports
        .assignments({ groupId: selectedGroupId, taskId: selectedTaskId })
        .then((rows) => rows ?? []),
    enabled: Boolean(selectedGroupId && selectedTaskId),
  });

  const analyticsQuery = useQuery<AssignmentAnalyticsResponse>({
    queryKey: ["reports", "assignment-analytics", analyticsFilters],
    queryFn: () => {
      const taskIdParam =
        analyticsFilters.taskId && analyticsFilters.taskId !== 'all'
          ? analyticsFilters.taskId
          : undefined;
      const groupIdParam =
        analyticsFilters.groupId && analyticsFilters.groupId !== 'all'
          ? analyticsFilters.groupId
          : undefined;

      return api.reports.assignmentAnalytics({
        dateFrom: analyticsFilters.dateFrom || undefined,
        dateTo: analyticsFilters.dateTo || undefined,
        taskId: taskIdParam,
        status: analyticsFilters.status,
        groupId: groupIdParam,
        page: analyticsFilters.page,
        limit: analyticsFilters.limit,
      });
    },
    keepPreviousData: true,
  });

  const assignmentDetailsQuery = useQuery<AssignmentDetails, HttpError | Error>({
    queryKey: ["reports", "assignment-details", selectedAnalyticsRow?.assignmentId],
    queryFn: () =>
      api.assignments
        .details(selectedAnalyticsRow?.assignmentId ?? "")
        .then(mapAssignmentDetailsFromApi),
    enabled: Boolean(selectedAnalyticsRow),
  });

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

  const handleOpenAnalyticsDialog = (row: AssignmentAnalyticsRow) => {
    setSelectedAnalyticsRow(row);
  };

  const closeAnalyticsDialog = () => {
    setSelectedAnalyticsRow(null);
  };

  const analyticsRows = analyticsQuery.data?.data ?? [];
  const analyticsSummary = analyticsQuery.data?.summary;
  const analyticsTotal = analyticsQuery.data?.total ?? 0;
  const analyticsTotalPages = Math.max(
    1,
    Math.ceil(analyticsTotal / analyticsFilters.limit),
  );

  const renderReportContent = () => {
    if (!selectedGroupId || !selectedTaskId) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Pasirinkite filtrus</AlertTitle>
          <AlertDescription>
            Norėdami pamatyti ataskaitą, pasirinkite grupę ir užduotį.
          </AlertDescription>
        </Alert>
      );
    }

    if (reportLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (reportError) {
      return <p className="text-destructive">Nepavyko įkelti ataskaitos.</p>;
    }

    if (!assignmentReport.length) {
      return (
        <p className="text-muted-foreground">
          Pasirinktai kombinacijai duomenų nerasta.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {assignmentReport.map((item) => {
          const stepsLabel =
            item.totalSteps > 0
              ? `${item.completedSteps} / ${item.totalSteps}`
              : item.completedSteps > 0
              ? `${item.completedSteps}`
              : "–";

          const progressValue =
            item.totalSteps > 0
              ? Math.round((item.completedSteps / item.totalSteps) * 100)
              : 0;

          const uiStatus = item.status
            ? resolveAssignmentUiStatus(item.status, item.dueDate ?? undefined)
            : "not_assigned";

          return (
            <div
              key={`${item.userId}-${item.assignmentId ?? "none"}`}
              className="border border-border/60 rounded-lg p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-medium">{item.userName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span>Žingsniai:</span>
                    <Badge variant="secondary">{stepsLabel}</Badge>
                    <span>{progressValue}%</span>
                    {item.dueDate ? (
                      <span>
                        Terminas:{" "}
                        {new Date(item.dueDate).toLocaleDateString("lt-LT")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.assignmentId ? (
                    <AssignmentStatusBadge
                      status={item.status ?? "not_started"}
                    />
                  ) : (
                    <Badge variant="outline">Nepriskirta</Badge>
                  )}
                  {item.overdue ? (
                    <Badge variant="destructive">Vėluoja</Badge>
                  ) : null}
                </div>
              </div>
              <Progress value={progressValue} className="mt-4" />
            </div>
          );
        })}
      </div>
    );
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Ataskaitos</h1>
        <p className="text-muted-foreground">
          Stebėkite grupių narių pažangą pagal priskirtas užduotis.
        </p>
      </div>

      <Card className="shadow-custom">
        <CardHeader>
          <CardTitle>Filtrai</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="report-group-select"
            >
              Grupė
            </label>
            <Select
              value={selectedGroupId}
              onValueChange={(value) => setSelectedGroupId(value)}
              disabled={groupsLoading || groupsError}
            >
              <SelectTrigger id="report-group-select">
                <SelectValue placeholder="Pasirinkite grupę" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="report-task-select"
            >
              Užduotis
            </label>
            <Select
              value={selectedTaskId}
              onValueChange={(value) => setSelectedTaskId(value)}
              disabled={tasksLoading || tasksError}
            >
              <SelectTrigger id="report-task-select">
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
          {groupsError || tasksError ? (
            <Alert className="md:col-span-2">
              <Info className="h-4 w-4" />
              <AlertTitle>Įvyko klaida</AlertTitle>
              <AlertDescription>
                Nepavyko įkelti grupių arba užduočių sąrašo. Bandykite perkrauti puslapį.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-custom">
        <CardHeader>
          <CardTitle>Progreso ataskaita</CardTitle>
        </CardHeader>
        <CardContent>{renderReportContent()}</CardContent>
      </Card>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium" htmlFor="analytics-task-select">
                Užduotis
              </label>
              <Select
                value={analyticsFilters.taskId}
                onValueChange={(value) =>
                  updateAnalyticsCriteria({ taskId: value })
                }
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
                onValueChange={(value) =>
                  updateAnalyticsCriteria({ groupId: value })
                }
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
                    <th className="px-3 py-2 text-left">Vartotojas</th>
                    <th className="px-3 py-2 text-left">Avilys</th>
                    <th className="px-3 py-2 text-left">Būklė</th>
                    <th className="px-3 py-2 text-left">Įvertinimas</th>
                    <th className="px-3 py-2 text-left">Užbaigta</th>
                    <th className="px-3 py-2 text-left">Veiksmai</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsRows.map((row) => (
                    <tr key={row.assignmentId} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">{row.taskTitle}</td>
                      <td className="px-3 py-3">{row.userName}</td>
                      <td className="px-3 py-3">{row.hiveLabel}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <AssignmentStatusBadge status={row.status} />
                          {row.overdue ? (
                            <Badge variant="destructive">Vėluoja</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">{row.rating ?? "—"}</td>
                      <td className="px-3 py-3">
                        {formatShortDate(row.completedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAnalyticsDialog(row)}
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
                disabled={
                  analyticsFilters.page <= 1 || analyticsQuery.isLoading
                }
                onClick={() => goToAnalyticsPage(analyticsFilters.page - 1)}
              >
                Ankstesnis
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  analyticsFilters.page >= analyticsTotalPages ||
                  analyticsQuery.isLoading
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
  );

  <Dialog
    open={Boolean(selectedAnalyticsRow)}
    onOpenChange={(open) => {
      if (!open) {
        closeAnalyticsDialog();
      }
    }}
  >
    <DialogContent className="w-full max-h-[90vh] sm:max-w-3xl flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Užduoties peržiūra</DialogTitle>
        <DialogDescription>
          Peržiūrėkite vartotojo pateiktus žingsnius ir įkeltus įrodymus.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Užduotis</p>
          <p className="text-lg font-semibold">
            {selectedAnalyticsRow?.taskTitle ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            Vartotojas: {selectedAnalyticsRow?.userName ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            Avilys: {selectedAnalyticsRow?.hiveLabel ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            Įvertinimas:{" "}
            <span className="font-semibold">
              {selectedAnalyticsRow?.rating ?? "—"}
            </span>
          </p>
          {selectedAnalyticsRow?.ratingComment ? (
            <p className="text-sm text-muted-foreground">
              {selectedAnalyticsRow.ratingComment}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Užbaigta: {formatShortDate(selectedAnalyticsRow?.completedAt)}
          </p>
          <p className="text-sm text-muted-foreground">
            Terminas: {formatShortDate(selectedAnalyticsRow?.dueDate)}
          </p>
        </div>

        {assignmentDetailsQuery.isLoading ? (
          <div className="py-6 text-center text-muted-foreground">
            Kraunama...
          </div>
        ) : assignmentDetailsQuery.data ? (
          <>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Žingsniai</p>
              <ul className="space-y-2 text-sm">
                {assignmentDetailsQuery.data.task.steps.map((step, index) => {
                  const progressEntry = assignmentDetailsQuery.data?.progress.find(
                    (entry) => entry.taskStepId === step.id,
                  );
                  const isCompleted = progressEntry?.status === "completed";
                  return (
                    <li
                      key={step.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span>
                        {index + 1}. {step.title}
                      </span>
                      <Badge variant={isCompleted ? "secondary" : "outline"}>
                        {isCompleted ? "Atliktas" : "Neatliktas"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>

            {assignmentDetailsQuery.data.progress
              .filter((entry) => entry.evidenceUrl)
              .map((entry) => (
                <div key={entry.id} className="space-y-2">
                  <p className="text-sm font-semibold">Įrodymas</p>
                  <div className="mx-auto w-full max-w-[600px]">
                    <ResponsiveMedia
                      url={entry.evidenceUrl ?? undefined}
                      type="image"
                      title="Įkelta nuotrauka"
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Neįmanoma užkrauti užduoties detalių.
          </p>
        )}
      </div>
      <DialogFooter className="flex justify-end">
        <Button variant="ghost" onClick={closeAnalyticsDialog}>
          Uždaryti
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  return (
    <MainLayout>
      {canView ? (
        content
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
