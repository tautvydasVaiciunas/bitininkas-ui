import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/Layout/MainLayout";
import api, { type AdminUserResponse } from "@/lib/api";
import { mapGroupFromApi, type Group, type GroupMember } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Plus,
  Users as UsersIcon,
  Edit2,
  Trash2,
  UserPlus,
} from "lucide-react";

interface GroupFormState {
  name: string;
  description: string;
}

const defaultFormState: GroupFormState = { name: "", description: "" };

const mapToOptionLabel = (user: AdminUserResponse) => user.name || user.email;

export default function AdminGroups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<GroupFormState>(defaultFormState);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GroupFormState>(defaultFormState);
  const [membersDialogGroupId, setMembersDialogGroupId] = useState<
    string | null
  >(null);
  const [memberToAdd, setMemberToAdd] = useState<string | undefined>();

  const {
    data: groups = [],
    isLoading,
    isError,
    error,
  } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const { data: users = [] } = useQuery<AdminUserResponse[]>({
    queryKey: ["users", "all"],
    queryFn: () => api.users.list(),
  });

  const editingGroup = useMemo(
    () => groups.find((group) => group.id === editingGroupId) ?? null,
    [groups, editingGroupId],
  );

  const membersDialogGroup = useMemo(
    () => groups.find((group) => group.id === membersDialogGroupId) ?? null,
    [groups, membersDialogGroupId],
  );

  const resetCreateForm = () => setCreateForm(defaultFormState);
  const resetEditForm = () => setEditForm(defaultFormState);

  const invalidateGroups = () => {
    void queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["users", "all"] });
  };

  const showErrorToast = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    });
  };

  const createGroupMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.groups.create(payload).then(mapGroupFromApi),
    onSuccess: (group) => {
      toast({
        title: "Grupė sukurta",
        description: `Grupė „${group.name}“ sėkmingai sukurta.`,
      });
      invalidateGroups();
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Nepavyko sukurti grupės";
      showErrorToast("Klaida", message);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; description?: string };
    }) => api.groups.update(id, payload).then(mapGroupFromApi),
    onSuccess: (group) => {
      toast({
        title: "Grupė atnaujinta",
        description: `Grupė „${group.name}“ sėkmingai atnaujinta.`,
      });
      invalidateGroups();
      setEditingGroupId(null);
      resetEditForm();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Nepavyko atnaujinti grupės";
      showErrorToast("Klaida", message);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.groups.remove(id),
    onSuccess: () => {
      toast({ title: "Grupė ištrinta" });
      invalidateGroups();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Nepavyko ištrinti grupės";
      showErrorToast("Klaida", message);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.groups.members.add(groupId, { userId }),
    onSuccess: () => {
      toast({
        title: "Vartotojas pridėtas į grupę",
      });
      invalidateGroups();
      invalidateUsers();
      setMemberToAdd(undefined);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Nepavyko pridėti nario";
      showErrorToast("Klaida", message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.groups.members.remove(groupId, userId),
    onSuccess: () => {
      toast({
        title: "Vartotojas pašalintas iš grupės",
      });
      invalidateGroups();
      invalidateUsers();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Nepavyko pašalinti nario";
      showErrorToast("Klaida", message);
    },
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createGroupMutation.isPending) return;
    const name = createForm.name.trim();
    if (!name) {
      showErrorToast("Trūksta pavadinimo", "Įveskite grupės pavadinimą.");
      return;
    }
    createGroupMutation.mutate({
      name,
      description: createForm.description.trim() || undefined,
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingGroup || updateGroupMutation.isPending) return;
    const name = editForm.name.trim();
    if (!name) {
      showErrorToast("Trūksta pavadinimo", "Įveskite grupės pavadinimą.");
      return;
    }
    updateGroupMutation.mutate({
      id: editingGroup.id,
      payload: {
        name,
        description: editForm.description.trim() || undefined,
      },
    });
  };

  const availableMembers = useMemo(() => {
    if (!membersDialogGroup) return users;
    const memberIds = new Set(
      membersDialogGroup.members.map((member) => member.userId),
    );
    return users.filter((user) => !memberIds.has(user.id));
  }, [membersDialogGroup, users]);

  const getErrorMessage = (value: unknown) => {
    if (!value) return undefined;
    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;
    return undefined;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Grupės</h1>
            <p className="text-muted-foreground mt-1">
              Kurkite grupes ir priskirkite vartotojus atsakingoms komandoms.
            </p>
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nauja grupė
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sukurti grupę</DialogTitle>
                <DialogDescription>
                  Įveskite grupės informaciją.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Pavadinimas</Label>
                  <Input
                    id="group-name"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">Aprašymas</Label>
                  <Input
                    id="group-description"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Trumpas grupės aprašymas"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                  >
                    {createGroupMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {createGroupMutation.isPending ? "Saugoma..." : "Sukurti"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-custom">
          <CardHeader>
            <CardTitle>Grupių sąrašas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Kraunama...
              </div>
            ) : isError ? (
              <p className="text-destructive">
                {getErrorMessage(error) ?? "Nepavyko įkelti grupių."}
              </p>
            ) : groups.length === 0 ? (
              <p className="text-muted-foreground">
                Šiuo metu nėra sukurtų grupių.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Pavadinimas</th>
                      <th className="pb-2 pr-4">Aprašymas</th>
                      <th className="pb-2 pr-4">Nariai</th>
                      <th className="pb-2 text-right">Veiksmai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id} className="border-t border-border/60">
                        <td className="py-3 pr-4 font-medium">{group.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {group.description || "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 w-fit"
                          >
                            <UsersIcon className="h-3 w-3" />
                            {group.members.length}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setEditForm({
                                  name: group.name,
                                  description: group.description ?? "",
                                });
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" /> Redaguoti
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMembersDialogGroupId(group.id)}
                            >
                              <UsersIcon className="mr-2 h-4 w-4" /> Nariai
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Šalinti
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Pašalinti grupę?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Pašalinus grupę, jos nariai nebus pašalinti
                                    iš sistemos, tačiau grupės priskyrimai bus
                                    ištrinti.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Atšaukti
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteGroupMutation.mutate(group.id)
                                    }
                                    disabled={deleteGroupMutation.isPending}
                                  >
                                    {deleteGroupMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Patvirtinti
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editingGroupId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroupId(null);
            resetEditForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redaguoti grupę</DialogTitle>
            <DialogDescription>
              Atnaujinkite grupės informaciją.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Pavadinimas</Label>
              <Input
                id="edit-group-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-description">Aprašymas</Label>
              <Input
                id="edit-group-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateGroupMutation.isPending}>
                {updateGroupMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {updateGroupMutation.isPending ? "Saugoma..." : "Išsaugoti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={membersDialogGroupId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMembersDialogGroupId(null);
            setMemberToAdd(undefined);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Grupės nariai</DialogTitle>
            <DialogDescription>
              {membersDialogGroup
                ? `Grupė „${membersDialogGroup.name}“`
                : "Pasirinkite grupę nariams valdyti."}
            </DialogDescription>
          </DialogHeader>
          {membersDialogGroup ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Esami nariai
                </h3>
                {membersDialogGroup.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Šioje grupėje dar nėra narių.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {membersDialogGroup.members.map((member) => (
                      <GroupMemberRow
                        key={member.id}
                        member={member}
                        onRemove={() =>
                          removeMemberMutation.mutate({
                            groupId: membersDialogGroup.id,
                            userId: member.userId,
                          })
                        }
                        isRemoving={removeMemberMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Pridėti naują narį
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={memberToAdd ?? undefined}
                    onValueChange={(value) => setMemberToAdd(value)}
                  >
                    <SelectTrigger className="sm:w-64">
                      <SelectValue placeholder="Pasirinkite vartotoją" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.length === 0 ? (
                        <SelectItem value="no-options" disabled>
                          Nėra laisvų vartotojų
                        </SelectItem>
                      ) : (
                        availableMembers
                          .filter((candidate) => typeof candidate.id === 'string' && candidate.id.length > 0)
                          .map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {mapToOptionLabel(candidate)}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (!memberToAdd || !membersDialogGroup) return;
                      addMemberMutation.mutate({
                        groupId: membersDialogGroup.id,
                        userId: memberToAdd,
                      });
                    }}
                    disabled={!memberToAdd || addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Pridėti narį
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function GroupMemberRow({
  member,
  onRemove,
  isRemoving,
}: {
  member: GroupMember;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const name =
    member.user?.name || member.user?.email || "Nežinomas vartotojas";
  const email =
    member.user?.email && member.user?.email !== name
      ? member.user.email
      : null;
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <div>
        <p className="font-medium text-sm">{name}</p>
        {email ? (
          <p className="text-xs text-muted-foreground">{email}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={isRemoving}
      >
        {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Pašalinti
      </Button>
    </div>
  );
}
