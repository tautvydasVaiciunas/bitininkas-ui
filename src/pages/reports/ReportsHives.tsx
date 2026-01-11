import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import api, { GroupAssignmentStatus } from "@/lib/api";
import { mapGroupFromApi, mapHiveFromApi, mapTaskFromApi } from "@/lib/types";
import {
  type AssignmentReportItem,
  type Group,
  type Hive,
  type Task,
} from "@/lib/types";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { appRoutes } from "@/lib/routes";

type HiveFilters = {
  groupId: string;
  hiveId: string;
  taskId: string;
  status: GroupAssignmentStatus;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: HiveFilters = {
  groupId: "",
  hiveId: "",
  taskId: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const statusOptions: { label: string; value: GroupAssignmentStatus }[] = [
  { label: "Visos", value: "all" },
  { label: "Laukiama", value: "waiting" },
  { label: "Vykdoma", value: "active" },
  { label: "Vėluoja", value: "overdue" },
  { label: "Užbaigta", value: "completed" },
];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("lt-LT") : "—";

export default function ReportsHives() {
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [filters, setFilters] = useState<HiveFilters>(defaultFilters);
  const [searchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const nextFilters: HiveFilters = { ...defaultFilters };
    const groupIdParam = searchParams.get("groupId");
    if (groupIdParam) {
      nextFilters.groupId = groupIdParam;
    }
    const taskIdParam = searchParams.get("taskId");
    if (taskIdParam) {
      nextFilters.taskId = taskIdParam;
    }
    const hiveIdParam = searchParams.get("hiveId");
    if (hiveIdParam) {
      nextFilters.hiveId = hiveIdParam;
    }
    const statusParam = searchParams.get("status") as GroupAssignmentStatus | null;
    if (statusParam) {
      nextFilters.status = statusParam;
    }
    const dateFromParam = searchParams.get("dateFrom");
    if (dateFromParam) {
      nextFilters.dateFrom = dateFromParam;
    }
    const dateToParam = searchParams.get("dateTo");
    if (dateToParam) {
      nextFilters.dateTo = dateToParam;
    }

    setFilters((prev) => ({
      ...prev,
      ...nextFilters,
    }));
  }, [searchParamsKey]);
  const [userSearch, setUserSearch] = useState("");

  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useQuery<Group[]>({
    queryKey: ["groups", "reports", "hives"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery<Task[]>({
    queryKey: ["tasks", "reports", "hives"],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const { data: hives = [], isLoading: hivesLoading, isError: hivesError } = useQuery<Hive[]>({
    queryKey: ["hives", "reports"],
    queryFn: async () => {
      const response = await api.hives.list();
      return response.map(mapHiveFromApi);
    },
  });

  const reportQuery = useQuery<AssignmentReportItem[]>({
    queryKey: [
      "reports",
      "assignments",
      filters.groupId,
      filters.hiveId,
      filters.taskId,
      filters.status,
      filters.dateFrom,
      filters.dateTo,
    ],
    enabled: Boolean(filters.groupId),
    keepPreviousData: true,
    queryFn: () =>
      api.reports.assignments({
        groupId: filters.groupId,
        hiveId: filters.hiveId || undefined,
        taskId: filters.taskId || undefined,
        status: filters.status,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
  });

  const resetFilters = () => {
    setFilters(defaultFilters);
    setUserSearch("");
  };

  const renderReportContent = () => {
    if (!filters.groupId) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Pasirinkite filtrus</AlertTitle>
          <AlertDescription>
            Norėdami matyti ataskaitą, pasirinkite grupę ir (nebūtinai) kitus kriterijus.
          </AlertDescription>
        </Alert>
      );
    }

    if (reportQuery.isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (reportQuery.isError) {
      return <p className="text-destructive">Nepavyko įkelti ataskaitos.</p>;
    }

    if (!filteredRows.length) {
      return <p className="text-muted-foreground">Pasirinktai kombinacijai duomenų nerasta.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Užduotis</th>
              <th className="px-3 py-2 text-left">Avilys</th>
              <th className="px-3 py-2 text-left">Vartotojas</th>
              <th className="px-3 py-2 text-left">Paskirta</th>
              <th className="px-3 py-2 text-left">Būsena</th>
              <th className="px-3 py-2 text-left">Žingsniai</th>
              <th className="px-3 py-2 text-left">Baigta</th>
              <th className="px-3 py-2 text-left">Paskutinė veikla</th>
              <th className="px-3 py-2 text-left">Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const stepsLabel =
                row.totalSteps > 0
                  ? `${row.completedSteps} / ${row.totalSteps}`
                  : row.completedSteps > 0
                  ? `${row.completedSteps}`
                  : "—";
              const progressValue =
                row.totalSteps > 0 ? Math.round((row.completedSteps / row.totalSteps) * 100) : 0;

              return (
                <tr key={row.assignmentId} className="border-t border-border">
                  <td className="px-3 py-3 font-medium">{row.taskTitle}</td>
                  <td className="px-3 py-3">{row.hiveLabel}</td>
                  <td className="px-3 py-3">{row.userName}</td>
                  <td className="px-3 py-3">{formatDate(row.assignedAt)}</td>
                  <td className="px-3 py-3">
                    <AssignmentStatusBadge status={row.status} dueDate={row.dueDate} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{stepsLabel}</Badge>
                      {row.dueDate ? (
                        <span>Terminas: {formatDate(row.dueDate)}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <Progress value={progressValue} className="h-2" />
                      <span className="text-[0.7rem] text-muted-foreground">
                        {progressValue}% ({row.completedSteps}/{row.totalSteps || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{formatDate(row.lastActivity)}</td>
                  <td className="px-3 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={appRoutes.taskDetail(row.assignmentId)}>Peržiūrėti</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout>
      <ReportsTabs />
      {canView ? (
        <div className="space-y-6">
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Filtrai</CardTitle>
              <CardDescription>Užpildykite norimus kriterijus ir pateikite ataskaitą.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="report-group-select">
                    Grupė
                  </label>
                  <Select
                    value={filters.groupId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, groupId: value }))}
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
                  <label className="text-sm font-medium" htmlFor="report-hive-select">
                    Avilys
                  </label>
                  <Select
                    value={filters.hiveId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, hiveId: value }))}
                    disabled={hivesLoading || hivesError}
                  >
                    <SelectTrigger id="report-hive-select">
                      <SelectValue placeholder="Visi aviliai" />
                    </SelectTrigger>
                    <SelectContent>
                      {hives.map((hive) => (
                        <SelectItem key={hive.id} value={hive.id}>
                          {hive.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="report-task-select">
                    Užduotis
                  </label>
                  <Select
                    value={filters.taskId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, taskId: value }))}
                    disabled={tasksLoading || tasksError}
                  >
                    <SelectTrigger id="report-task-select">
                      <SelectValue placeholder="Visos užduotys" />
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

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="report-status-select">
                    Būsena
                  </label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value as GroupAssignmentStatus }))
                    }
                  >
                    <SelectTrigger id="report-status-select">
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
                  <label className="text-sm font-medium" htmlFor="report-date-from">
                    Laikotarpis nuo
                  </label>
                  <Input
                    id="report-date-from"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="report-date-to">
                    iki
                  </label>
                  <Input
                    id="report-date-to"
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="report-user-search">
                    Vartotojas (ieškoti)
                  </label>
                  <Input
                    id="report-user-search"
                    placeholder="Vardas ar el. paštas"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Išvalyti filtrus
                  </Button>
                </div>
              </div>

              {(groupsError || tasksError || hivesError) && (
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
              <CardTitle>Avilių užduotys</CardTitle>
              <CardDescription>Operatyvinis vaizdas konkretiems aviliams.</CardDescription>
            </CardHeader>
            <CardContent>{renderReportContent()}</CardContent>
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
