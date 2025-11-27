import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ltMessages from "@/i18n/messages.lt.json";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import api, { HttpError, type AdminUserResponse } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import {
  mapHiveFromApi,
  type CreateHivePayload,
  type Hive,
  type HiveStatus,
  type HiveTag,
  type UpdateHivePayload,
} from "@/lib/types";
import {
  Box,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  Tag as TagIcon,
} from "lucide-react";
import {
  UserMultiSelect,
  type MultiSelectOption,
} from "@/components/UserMultiSelect";
import { TagSelect } from "@/components/TagSelect";

type UpdateHiveVariables = {
  id: string;
  payload: UpdateHivePayload;
};

type MutationError = HttpError | Error;

type HiveCardProps = {
  hive: Hive;
  onUpdateStatus: (id: string, status: HiveStatus) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  canManage: boolean;
};

type HiveListStatusFilter = 'active' | 'archived' | 'all';

type CreateHiveFormState = {
  label: string;
  location: string;
  members: string[];
  tagId: string | null;
};


const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatMonthYear = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
  });
};

const HIVE_CARD_IMAGE_SRC = "/assets/bus_medaus_avilys_ikona.png";

function HiveCard({
  hive,
  onUpdateStatus,
  onArchive,
  onDelete,
  isUpdating,
  isArchiving,
  isDeleting,
  canManage,
}: HiveCardProps) {
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ["hives", hive.id, "summary"],
    queryFn: () => api.hives.summary(hive.id),
  });

  const activeAssignmentsCount = summary?.activeAssignmentsCount ?? 0;
  const overdueAssignmentsCount = summary?.overdueAssignmentsCount ?? 0;
  const progressPercent = summary
    ? Math.max(
        0,
        Math.min(100, summary.primaryAssignmentProgress ?? summary.completion),
      )
    : 0;
  const urgencyVariant =
    overdueAssignmentsCount > 0
      ? "destructive"
      : activeAssignmentsCount > 0
      ? "default"
      : "success";
  const urgencyLabel =
    overdueAssignmentsCount > 0
      ? "Vėluoja"
      : activeAssignmentsCount > 0
      ? "Aktyvus"
      : "Ramu";
  const assignmentRunLink =
    activeAssignmentsCount > 0 && summary?.primaryAssignmentId
      ? `/tasks/${summary.primaryAssignmentId}/run`
      : undefined;

  return (
    <div className="h-full flex flex-col">
      <Card className="shadow-custom hover:shadow-custom-md transition-all group h-full flex flex-col overflow-hidden">
        <div className="h-56 w-full overflow-hidden rounded-t-lg bg-white">
          <Link
            to={`/hives/${hive.id}`}
            className="flex h-full w-full items-center justify-center"
            aria-label={`Peržiūrėti ${hive.label}`}
          >
            <img
              src={HIVE_CARD_IMAGE_SRC}
              alt="Avilio iliustracija"
              className="max-h-full max-w-full object-contain"
            />
          </Link>
        </div>
        <div className="flex flex-col flex-1">
          <CardHeader className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
              <CardTitle className="text-xl mb-1">{hive.label}</CardTitle>
                {hive.location ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{hive.location}</span>
                  </div>
                ) : null}
              </div>
              {hive.tag ? (
                <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TagIcon className="w-4 h-4" />
                    <span>{hive.tag.name}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4">
            <div className="flex flex-col gap-3 text-sm flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Bičių šeimos suleidimas:
                </span>
                <span>{formatMonthYear(hive.createdAt)}</span>
              </div>

              <div>
                {summaryLoading ? (
                  <Skeleton className="h-16 w-full rounded-lg" />
                ) : summary ? (
                  (() => {
                    const assignmentContent = (
                      <div
                        className={`rounded-lg border border-border px-3 py-2 text-sm ${
                          assignmentRunLink ? "hover:border-foreground hover:bg-muted/20" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Aktyvios užduotys</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{activeAssignmentsCount}</span>
                            <Badge
                              variant={urgencyVariant}
                              className="h-3 w-3 p-0 border-0"
                              aria-label={urgencyLabel}
                            />
                            <span className="sr-only">{urgencyLabel}</span>
                          </div>
                        </div>
                        {activeAssignmentsCount > 0 ? (
                          <div className="mt-1 text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Užbaigta: {progressPercent}%
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                    return assignmentRunLink ? (
                      <Link
                        to={assignmentRunLink}
                        className="block cursor-pointer"
                        aria-label="Eiti į aktyviausią užduotį"
                      >
                        {assignmentContent}
                      </Link>
                    ) : (
                      assignmentContent
                    );
                  })()
                ) : summaryError ? (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive-foreground">
                    Nepavyko įkelti suvestinės
                  </div>
                ) : (
                  <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                    Nėra suvestinės duomenų
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <Link to={`/hives/${hive.id}`}>
                  Peržiūrėti
                  <ChevronRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete"
                ? "Ištrinti avilį?"
                : "Ar archyvuoti avilį?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "Šis veiksmas negrįžtamas. Avilys ir su juo susiję duomenys gali būti pašalinti iš sistemos."
                : "Archyvavus avilį, jis bus pašalintas iš aktyvių sąrašų, tačiau jo duomenys bus išsaugoti."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === "archive") {
                  onArchive(hive.id);
                } else if (confirmAction === "delete") {
                  onDelete(hive.id);
                }
                setConfirmAction(null);
              }}
              className={
                confirmAction === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmAction === "delete"
                ? isDeleting
                  ? "Šalinama..."
                  : "Ištrinti"
                : isArchiving
                  ? "Archyvuojama..."
                  : "Archyvuoti"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export default function Hives() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateHiveFormState>({
    label: "",
    location: "",
    members: [],
    tagId: null,
  });

    const canManageHives = user?.role === "admin" || user?.role === "manager";
    const canManageMembers = user?.role === "admin" || user?.role === "manager";
    const isPrivileged = canManageHives;
    const [searchEmail, setSearchEmail] = useState("");
    const [statusFilter, setStatusFilter] = useState<HiveListStatusFilter>("active");

  const { data: users = [] } = useQuery<AdminUserResponse[]>({
    queryKey: ["users", "all"],
    queryFn: () => api.users.list(),
    enabled: canManageMembers,
  });

  const memberOptions: MultiSelectOption[] = useMemo(() => {
    if (!users.length) return [];
    return users.map((item) => ({
      value: item.id,
      label: item.name || item.email,
      description: item.name ? item.email : undefined,
    }));
  }, [users]);

  const {
    data: hives = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Hive[], MutationError>({
    queryKey: ["hives"],
    queryFn: async () => {
      const response = await api.hives.list();
      return response.map(mapHiveFromApi);
    },
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery<HiveTag[]>({
    queryKey: ["hive-tags", "all"],
    queryFn: () => api.hiveTags.list(),
  });

  const defaultHiveLabel = useMemo(() => {
    const total = hives.length;
    return `Avilys ${total + 1}`;
  }, [hives.length]);

  useEffect(() => {
    if (!isCreateDialogOpen) {
      return;
    }
    setCreateForm((prev) => ({
      ...prev,
      label: prev.label.trim().length > 0 ? prev.label : defaultHiveLabel,
    }));
  }, [isCreateDialogOpen, defaultHiveLabel]);

  const resetCreateForm = () =>
    setCreateForm({ label: "", location: "", members: [], tagId: null });

  const showErrorToast = (title: string, errorValue: unknown) => {
    const description = getApiErrorMessage(errorValue);
    toast({
      title,
      description,
      variant: "destructive",
    });
  };

  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.hiveTags.create({ name }),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ["hive-tags", "all"] });
      setCreateForm((prev) => ({ ...prev, tagId: tag.id }));
      toast({
        title: "Žyma sukurta",
        description: `Žyma „${tag.name}“ sėkmingai pridėta.`,
      });
    },
    onError: (err: unknown) => {
      showErrorToast("Nepavyko sukurti žymos", err);
    },
  });

  const createHiveMutation = useMutation<
    Hive,
    MutationError,
    CreateHivePayload
  >({
    mutationFn: (payload) => api.hives.create(payload).then(mapHiveFromApi),
    onSuccess: (createdHive) => {
      queryClient.invalidateQueries({ queryKey: ["hives"] });
      toast({
        title: "Avilys sukurtas",
        description: `Avilys „${createdHive.label}“ sėkmingai pridėtas.`,
      });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (err) => {
      showErrorToast(ltMessages.hives.createError, err);
    },
  });

  const updateHiveMutation = useMutation<
    Hive,
    MutationError,
    UpdateHiveVariables
  >({
    mutationFn: ({ id, payload }) =>
      api.hives.update(id, payload).then(mapHiveFromApi),
    onSuccess: (updatedHive, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hives"] });
      queryClient.invalidateQueries({
        queryKey: ["hives", variables.id, "summary"],
      });
      toast({
        title: "Avilys atnaujintas",
        description: `Atnaujintas avilio „${updatedHive.label}“ statusas.`,
      });
    },
    onError: (err) => {
      showErrorToast("Nepavyko atnaujinti avilio", err);
    },
  });

  const archiveHiveMutation = useMutation<Hive, MutationError, string>({
    mutationFn: (id) =>
      api.hives.update(id, { status: "archived" }).then(mapHiveFromApi),
    onSuccess: (archivedHive, hiveId) => {
      queryClient.invalidateQueries({ queryKey: ["hives"] });
      queryClient.invalidateQueries({ queryKey: ["hives", hiveId, "summary"] });
      toast({
        title: "Avilys archyvuotas",
        description: `Avilys „${archivedHive.label}“ perkeltas į archyvą.`,
      });
    },
    onError: (err) => {
      showErrorToast("Nepavyko archyvuoti avilio", err);
    },
  });

  const deleteHiveMutation = useMutation<void, MutationError, string>({
    mutationFn: (id) => api.hives.remove(id),
    onSuccess: (_, hiveId) => {
      queryClient.invalidateQueries({ queryKey: ["hives"] });
      queryClient.removeQueries({ queryKey: ["hives", hiveId, "summary"] });
      toast({
        title: "Avilys ištrintas",
        description: "Avilys pašalintas iš sistemos.",
      });
    },
    onError: (err) => {
      showErrorToast("Nepavyko ištrinti avilio", err);
    },
  });

  const accessibleHives = useMemo(() => {
    const list = Array.isArray(hives) ? hives : [];
    if (isPrivileged) {
      return list;
    }
    return list.filter((hive) => {
      const isOwner = hive.ownerUserId === user?.id;
      const isMember = hive.members.some((member) => member.id === user?.id);
      return (isOwner || isMember) && hive.status !== "archived";
    });
  }, [hives, isPrivileged, user?.id]);

  const filteredHives = useMemo(() => {
    let list = accessibleHives;

    if (isPrivileged) {
      if (statusFilter === "active") {
        list = list.filter((hive) => hive.status !== "archived");
      } else if (statusFilter === "archived") {
        list = list.filter((hive) => hive.status === "archived");
      }

      const query = searchEmail.trim().toLowerCase();
      if (query) {
        list = list.filter((hive) => {
          const ownerEmail = hive.owner?.email?.toLowerCase() ?? "";
          if (ownerEmail.includes(query)) {
            return true;
          }
          return hive.members.some((member) =>
            (member.email ?? "").toLowerCase().includes(query),
          );
        });
      }
    }

    return list;
  }, [accessibleHives, isPrivileged, searchEmail, statusFilter]);

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (createHiveMutation.isPending) return;

    const trimmedLabel = createForm.label.trim() || defaultHiveLabel;
    const payload: CreateHivePayload = {
      label: trimmedLabel,
      location: createForm.location.trim() || undefined,
      status: "active",
      tagId: createForm.tagId ?? undefined,
    };

    if (canManageMembers && createForm.members.length > 0) {
      payload.members = createForm.members;
    }

    if (!payload.label) {
      toast({
        title: "Trūksta pavadinimo",
        description: "Įveskite avilio pavadinimą prieš išsaugant.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createHiveMutation.mutateAsync(payload);
    } catch (err) {
      // klaida apdorojama onError
      console.error(err);
    }
  };

  const handleUpdateStatus = (id: string, status: HiveStatus) => {
    if (updateHiveMutation.isPending) return;
    updateHiveMutation.mutate({ id, payload: { status } });
  };

  const handleArchive = (id: string) => {
    if (archiveHiveMutation.isPending) return;
    archiveHiveMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (deleteHiveMutation.isPending) return;
    deleteHiveMutation.mutate(id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Aviliai</h1>
              <p className="text-muted-foreground mt-1">Valdykite savo avilius</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {isPrivileged ? (
                <div className="w-full max-w-xs">
                  <Input
                    placeholder="Ieškoti pagal vartotojo el. paštą…"
                    value={searchEmail}
                    onChange={(event) => setSearchEmail(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {isPrivileged ? (
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as HiveListStatusFilter)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filtruoti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktyvūs</SelectItem>
                      <SelectItem value="archived">Archyvuoti</SelectItem>
                      <SelectItem value="all">Visi</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {canManageHives ? (
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
                      <Button disabled={createHiveMutation.isPending}>
                        {createHiveMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        {createHiveMutation.isPending
                          ? "Kuriama..."
                          : "Pridėti avilį"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] w-full sm:max-w-lg flex flex-col">
                      <DialogHeader>
                      <DialogTitle>Pridėti avilį</DialogTitle>
                      <DialogDescription>Įveskite pagrindinius avilio duomenis.</DialogDescription>
                      </DialogHeader>
                      <form
                        id="create-hive-form"
                        onSubmit={handleCreateSubmit}
                        className="flex flex-col flex-1 gap-6 overflow-y-auto"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="create-hive-label">Pavadinimas</Label>
                          <Input
                            id="create-hive-label"
                            value={createForm.label}
                            onChange={(event) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                label: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-hive-location">Lokacija</Label>
                          <Input
                            id="create-hive-location"
                            value={createForm.location}
                            onChange={(event) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                location: event.target.value,
                              }))
                            }
                            placeholder="Pvz., Vilnius, Žvėrynas"
                          />
                        </div>
                        {canManageMembers ? (
                          <div className="space-y-2">
                            <Label>Priskirti vartotojai</Label>
                            <UserMultiSelect
                              options={memberOptions}
                              value={createForm.members}
                              onChange={(members) =>
                                setCreateForm((prev) => ({ ...prev, members }))
                              }
                              placeholder="Pasirinkite komandos narius (nebūtina)"
                            />
                          </div>
                        ) : null}
                        <DialogFooter className="flex-shrink-0">
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setIsCreateDialogOpen(false)}
                          >
                            Atšaukti
                          </Button>
                          <Button
                            type="submit"
                            disabled={createHiveMutation.isPending}
                          >
                            {createHiveMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Išsaugoti
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </div>
          </div>

        

        {isError ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center space-y-4">
              <h3 className="text-lg font-semibold">{ltMessages.hives.loadError}</h3>
              <p className="text-muted-foreground">
                {getApiErrorMessage(error)}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Bandyti iš naujo
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="shadow-custom">
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                  <div className="mt-2 flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredHives.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nerasta avilių</h3>
              <p className="text-muted-foreground mb-6">
                Pradėkite pridėdami savo pirmą avilį
              </p>
              {canManageHives && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 w-4 h-4" />
                  Pridėti avilį
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHives.map((hive) => (
              <HiveCard
                key={hive.id}
                hive={hive}
                onUpdateStatus={handleUpdateStatus}
                onArchive={handleArchive}
                onDelete={handleDelete}
                isUpdating={
                  updateHiveMutation.isPending &&
                  updateHiveMutation.variables?.id === hive.id
                }
                isArchiving={
                  archiveHiveMutation.isPending &&
                  archiveHiveMutation.variables === hive.id
                }
                isDeleting={
                  deleteHiveMutation.isPending &&
                  deleteHiveMutation.variables === hive.id
                }
                canManage={canManageHives}
              />
            ))}
            {!isPrivileged ? (
              <Link to="/parduotuve" className="group">
                <Card className="shadow-custom hover:shadow-custom-md transition-all group h-full min-h-[560px] flex flex-col overflow-hidden border border-dashed border-muted-foreground/60 bg-muted/10 text-muted-foreground">
                  <div className="h-56 w-full flex items-center justify-center rounded-t-lg bg-muted-foreground/20 text-muted-foreground">
                    <Plus className="h-16 w-16" />
                  </div>
                  <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-xl font-semibold text-foreground">
                      Papildyti avilių kiekį
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      Aplankykite parduotuvę ir papildykite atsargas įrankiais bei korpusais.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

