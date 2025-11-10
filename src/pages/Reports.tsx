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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { type AssignmentReportItem, type Group, type Task } from "@/lib/types";
import { mapGroupFromApi, mapTaskFromApi } from "@/lib/mappers";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { resolveAssignmentUiStatus } from "@/lib/assignmentStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Reports() {
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

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
    </div>
  );

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
