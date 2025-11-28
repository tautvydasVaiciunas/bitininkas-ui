import { useEffect, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { AssignmentStatusBadge } from "@/components/AssignmentStatusBadge";
import { mapGroupFromApi, mapUserFromApi } from "@/lib/types";
import type {
  AssignmentReportItem,
  AssignmentUserSummaryRow,
  Group,
  User,
} from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const statusOptions = [
  { label: "Visos", value: "all" },
  { label: "Laukiama", value: "waiting" },
  { label: "Vykdoma", value: "active" },
  { label: "Vėluoja", value: "overdue" },
  { label: "Užbaigta", value: "completed" },
];

const formatShortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("lt-LT") : "—";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 3 }, (_, index) => currentYear - 1 + index);

const filtersDefault = {
  year: String(currentYear),
  groupId: "",
  userId: "",
  status: "all",
};

export default function ReportsUsers() {
  const { user } = useAuth();
  const canView = user?.role === "manager" || user?.role === "admin";
  const [filters, setFilters] = useState(filtersDefault);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedUserId(null);
  }, [filters.year, filters.groupId, filters.userId, filters.status]);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["groups", "reports", "users"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["users", "reports"],
    queryFn: async () => {
      const response = await api.users.list({ limit: 100 });
      return response.data.map(mapUserFromApi);
    },
  });

  const summaryQuery = useQuery<AssignmentUserSummaryRow[]>({
    queryKey: [
      "reports",
      "users",
      filters.year,
      filters.groupId,
      filters.userId,
      filters.status,
    ],
    enabled: Boolean(filters.year),
    queryFn: () =>
      api.reports.userSummary({
        year: filters.year,
        groupId: filters.groupId || undefined,
        userId: filters.userId || undefined,
        status: filters.status,
      }),
  });

  const assignmentQuery = useQuery<AssignmentReportItem[]>({
    queryKey: ["reports", "users", "assignments", selectedUserId, filters.year, filters.groupId],
    enabled: Boolean(selectedUserId),
    queryFn: () =>
      api.reports.userAssignments({
        year: filters.year,
        userId: selectedUserId ?? "",
        groupId: filters.groupId || undefined,
        status: filters.status,
      }),
  });

  const resetFilters = () => {
    setFilters(filtersDefault);
  };

  return (
    <MainLayout>
      {canView ? (
        <div className="space-y-6">
          <ReportsTabs />
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Vartotojų suvestinė</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="year-select">
                    Metai
                  </label>
                  <Select
                    id="year-select"
                    value={filters.year}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, year: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite metus" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="user-group-select">
                    Grupė
                  </label>
                  <Select
                    id="user-group-select"
                    value={filters.groupId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, groupId: value }))}
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
                  <label className="text-sm font-medium" htmlFor="user-select">
                    Vartotojas
                  </label>
                  <Select
                    id="user-select"
                    value={filters.userId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, userId: value }))}
                    disabled={usersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visi vartotojai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Visi vartotojai</SelectItem>
                      {users.map((usr) => (
                        <SelectItem key={usr.id} value={usr.id}>
                          {usr.name ?? usr.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="user-status-select">
                    Būsena
                  </label>
                  <Select
                    id="user-status-select"
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value as AssignmentAnalyticsStatus }))
                    }
                  >
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Išvalyti filtrus
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Vartotojai</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : summaryQuery.isError ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Klaida</AlertTitle>
                  <AlertDescription>Duomenų nepavyko įkelti.</AlertDescription>
                </Alert>
              ) : !summaryQuery.data?.length ? (
                <p className="text-muted-foreground">Duomenų nerasta.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Vartotojas</th>
                      <th className="px-3 py-2 text-left">Viso užduočių</th>
                      <th className="px-3 py-2 text-left">Užbaigta</th>
                      <th className="px-3 py-2 text-left">Vykdoma</th>
                      <th className="px-3 py-2 text-left">Vėluoja</th>
                      <th className="px-3 py-2 text-left">Vid. įvertinimas</th>
                      <th className="px-3 py-2 text-left">Vid. vėlavimas</th>
                      <th className="px-3 py-2 text-left">Paskutinė užbaigta</th>
                      <th className="px-3 py-2 text-left">Veiksmai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryQuery.data.map((row) => (
                      <tr key={row.userId} className="border-t border-border">
                        <td className="px-3 py-3">
                          <p className="font-medium">{row.userName}</p>
                          <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                        </td>
                        <td className="px-3 py-3">{row.totalAssignments}</td>
                        <td className="px-3 py-3">{row.completedCount}</td>
                        <td className="px-3 py-3">{row.activeCount}</td>
                        <td className="px-3 py-3">{row.overdueCount}</td>
                        <td className="px-3 py-3">{row.avgRating ? row.avgRating.toFixed(1) : "—"}</td>
                        <td className="px-3 py-3">
                          {row.avgDelayDays !== null ? row.avgDelayDays.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3">{formatShortDate(row.lastCompletedAt)}</td>
                        <td className="px-3 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!row.userId}
                            onClick={() => setSelectedUserId(row.userId)}
                          >
                            Peržiūrėti
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => !open && setSelectedUserId(null)}>
            <DialogContent className="w-full max-h-[90vh] sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Vartotojo užduotys</DialogTitle>
                <DialogDescription>
                  {selectedUserId ? `Pasirinkti metai: ${filters.year}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1">
                {assignmentQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : assignmentQuery.isError ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Klaida</AlertTitle>
                    <AlertDescription>Duomenų nepavyko įkelti.</AlertDescription>
                  </Alert>
                ) : assignmentQuery.data.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Užduotis</th>
                          <th className="px-3 py-2 text-left">Avilys</th>
                          <th className="px-3 py-2 text-left">Būsena</th>
                          <th className="px-3 py-2 text-left">Žingsniai</th>
                          <th className="px-3 py-2 text-left">Progressas</th>
                          <th className="px-3 py-2 text-left">Veiksmai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentQuery.data.map((row) => {
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
                            <tr key={row.assignmentId} className="border-t border-border">
                              <td className="px-3 py-3 font-medium">{row.taskTitle}</td>
                              <td className="px-3 py-3">{row.hiveLabel}</td>
                              <td className="px-3 py-3">
                                <AssignmentStatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-3">{stepsLabel}</td>
                              <td className="px-3 py-3">
                                <Progress value={progress} className="h-2" />
                              </td>
                              <td className="px-3 py-3">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`/tasks/${row.assignmentId}/run`}>Peržiūrėti</a>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Duomenų nerasta.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSelectedUserId(null)}>
                  Uždaryti
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
