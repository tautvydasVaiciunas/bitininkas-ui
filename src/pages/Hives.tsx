import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api, { HttpError, type AdminUserResponse } from '@/lib/api';
import {
  mapHiveFromApi,
  type CreateHivePayload,
  type Hive,
  type HiveStatus,
  type UpdateHivePayload,
} from '@/lib/types';
import { Box, Calendar, ChevronRight, Loader2, MapPin, MoreVertical, Plus, Search } from 'lucide-react';
import { UserMultiSelect, type MultiSelectOption } from '@/components/UserMultiSelect';

type StatusFilter = HiveStatus | 'all';

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
};

const statusMetadata: Record<HiveStatus, { label: string; badgeVariant: BadgeProps['variant'] }> = {
  active: { label: 'Aktyvus', badgeVariant: 'success' },
  paused: { label: 'Pristabdytas', badgeVariant: 'secondary' },
  archived: { label: 'Archyvuotas', badgeVariant: 'outline' },
};

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Visi statusai' },
  { value: 'active', label: 'Aktyvūs' },
  { value: 'paused', label: 'Pristabdyti' },
  { value: 'archived', label: 'Archyvuoti' },
];

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getErrorMessage = (error: unknown) => {
  if (!error) return undefined;
  if (error instanceof HttpError) {
    const data = error.data as { message?: string } | undefined;
    return data?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

function HiveCard({
  hive,
  onUpdateStatus,
  onArchive,
  onDelete,
  isUpdating,
  isArchiving,
  isDeleting,
}: HiveCardProps) {
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
  const statusMeta = statusMetadata[hive.status];
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ['hives', hive.id, 'summary'],
    queryFn: () => api.hives.summary(hive.id),
  });

  const completionPercent = summary ? Math.round(summary.completion * 100) : 0;

  return (
    <Card className="shadow-custom hover:shadow-custom-md transition-all group">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{hive.label}</CardTitle>
            {hive.location ? (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{hive.location}</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={hive.status === 'active' || isUpdating}
                  onSelect={() => {
                    onUpdateStatus(hive.id, 'active');
                  }}
                >
                  Pažymėti kaip aktyvų
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={hive.status === 'paused' || isUpdating}
                  onSelect={() => {
                    onUpdateStatus(hive.id, 'paused');
                  }}
                >
                  Pristabdyti
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isArchiving || hive.status === 'archived'}
                  onSelect={() => {
                    setConfirmAction('archive');
                  }}
                >
                  Archyvuoti
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                  onSelect={() => {
                    setConfirmAction('delete');
                  }}
                >
                  Ištrinti
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Sukurta:</span>
            <span>{formatDate(hive.createdAt)}</span>
          </div>
          {hive.queenYear ? (
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Karalienės metai:</span>
              <span>{hive.queenYear} m.</span>
            </div>
          ) : null}
        </div>

        {summaryLoading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : summary ? (
          <div className="rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Priskirtos užduotys</span>
              <span className="font-medium">{summary.assignmentsCount}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              Užbaigta: <span className="font-medium text-foreground">{completionPercent}%</span>
            </div>
          </div>
        ) : summaryError ? (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive-foreground">
            Nepavyko įkelti suvestinės
          </div>
        ) : (
          <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            Nėra suvestinės duomenų
          </div>
        )}

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/hives/${hive.id}`}>
              Peržiūrėti
              <ChevronRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'delete' ? 'Ištrinti avilį?' : 'Ar archyvuoti avilį?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete'
                ? 'Šis veiksmas negrįžtamas. Avilys ir su juo susiję duomenys gali būti pašalinti iš sistemos.'
                : 'Archyvavus avilį, jis bus pašalintas iš aktyvių sąrašų, tačiau jo duomenys bus išsaugoti.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'archive') {
                  onArchive(hive.id);
                } else if (confirmAction === 'delete') {
                  onDelete(hive.id);
                }
                setConfirmAction(null);
              }}
              className={confirmAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {confirmAction === 'delete'
                ? isDeleting
                  ? 'Šalinama...'
                  : 'Ištrinti'
                : isArchiving
                ? 'Archyvuojama...'
                : 'Archyvuoti'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function Hives() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ label: '', location: '', queenYear: '', members: [] as string[] });

  const isAdmin = user?.role === 'admin';
  const canManageMembers = user?.role === 'admin' || user?.role === 'manager';

  const { data: users = [] } = useQuery<AdminUserResponse[]>({
    queryKey: ['users', 'all'],
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
    queryKey: ['hives'],
    queryFn: async () => {
      const response = await api.hives.list();
      return response.map(mapHiveFromApi);
    },
  });

  const resetCreateForm = () => setCreateForm({ label: '', location: '', queenYear: '', members: [] });

  const showErrorToast = (title: string, errorValue: unknown) => {
    const description = getErrorMessage(errorValue);
    toast({
      title,
      description,
      variant: 'destructive',
    });
  };

  const createHiveMutation = useMutation<Hive, MutationError, CreateHivePayload>({
    mutationFn: (payload) => api.hives.create(payload).then(mapHiveFromApi),
    onSuccess: (createdHive) => {
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      toast({
        title: 'Avilys sukurtas',
        description: `Avilys „${createdHive.label}“ sėkmingai pridėtas.`,
      });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (err) => {
      showErrorToast('Nepavyko sukurti avilio', err);
    },
  });

  const updateHiveMutation = useMutation<Hive, MutationError, UpdateHiveVariables>({
    mutationFn: ({ id, payload }) => api.hives.update(id, payload).then(mapHiveFromApi),
    onSuccess: (updatedHive, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      queryClient.invalidateQueries({ queryKey: ['hives', variables.id, 'summary'] });
      toast({
        title: 'Avilys atnaujintas',
        description: `Atnaujintas avilio „${updatedHive.label}“ statusas.`,
      });
    },
    onError: (err) => {
      showErrorToast('Nepavyko atnaujinti avilio', err);
    },
  });

  const archiveHiveMutation = useMutation<Hive, MutationError, string>({
    mutationFn: (id) => api.hives.update(id, { status: 'archived' }).then(mapHiveFromApi),
    onSuccess: (archivedHive, hiveId) => {
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      queryClient.invalidateQueries({ queryKey: ['hives', hiveId, 'summary'] });
      toast({
        title: 'Avilys archyvuotas',
        description: `Avilys „${archivedHive.label}“ perkeltas į archyvą.`,
      });
    },
    onError: (err) => {
      showErrorToast('Nepavyko archyvuoti avilio', err);
    },
  });

  const deleteHiveMutation = useMutation<void, MutationError, string>({
    mutationFn: (id) => api.hives.remove(id),
    onSuccess: (_, hiveId) => {
      queryClient.invalidateQueries({ queryKey: ['hives'] });
      queryClient.removeQueries({ queryKey: ['hives', hiveId, 'summary'] });
      toast({
        title: 'Avilys ištrintas',
        description: 'Avilys pašalintas iš sistemos.',
      });
    },
    onError: (err) => {
      showErrorToast('Nepavyko ištrinti avilio', err);
    },
  });

  const accessibleHives = useMemo(() => {
    const list = Array.isArray(hives) ? hives : [];
    if (isAdmin) return list;
    return list.filter((hive) => {
      if (hive.ownerUserId === user?.id) return true;
      return hive.members.some((member) => member.id === user?.id);
    });
  }, [hives, isAdmin, user?.id]);

  const filteredHives = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return accessibleHives.filter((hive) => {
      const matchesSearch =
        !normalizedSearch ||
        hive.label.toLowerCase().includes(normalizedSearch) ||
        (hive.location ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || hive.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [accessibleHives, searchQuery, statusFilter]);

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createHiveMutation.isPending) return;

    const payload: CreateHivePayload = {
      label: createForm.label.trim(),
      location: createForm.location.trim() || undefined,
      queenYear: createForm.queenYear ? Number(createForm.queenYear) : undefined,
      status: 'active',
    };

    if (canManageMembers && createForm.members.length > 0) {
      payload.members = createForm.members;
    }

    if (!payload.label) {
      toast({
        title: 'Trūksta pavadinimo',
        description: 'Įveskite avilio pavadinimą prieš išsaugant.',
        variant: 'destructive',
      });
      return;
    }

    if (payload.queenYear && Number.isNaN(payload.queenYear)) {
      toast({
        title: 'Neteisingi karalienės metai',
        description: 'Prašome įvesti teisingą metų skaičių.',
        variant: 'destructive',
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
                {createHiveMutation.isPending ? 'Kuriama...' : 'Pridėti avilį'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Naujas avilys</DialogTitle>
                <DialogDescription>Užpildykite informaciją apie avilį.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hive-label">Pavadinimas</Label>
                  <Input
                    id="hive-label"
                    value={createForm.label}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="Pvz., Avilys 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hive-location">Vieta</Label>
                  <Input
                    id="hive-location"
                    value={createForm.location}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Pvz., Vilnius, Žvėrynas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hive-queen-year">Karalienės metai</Label>
                  <Input
                    id="hive-queen-year"
                    type="number"
                    value={createForm.queenYear}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, queenYear: event.target.value }))}
                    placeholder="Pvz., 2024"
                    min={1900}
                    max={2100}
                  />
                </div>
                {canManageMembers ? (
                  <div className="space-y-2">
                    <Label>Priskirti vartotojus</Label>
                    <UserMultiSelect
                      options={memberOptions}
                      value={createForm.members}
                      onChange={(members) => setCreateForm((prev) => ({ ...prev, members }))}
                      placeholder="Pasirinkite komandos narius (nebūtina)"
                    />
                  </div>
                ) : null}
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
                    Atšaukti
                  </Button>
                  <Button type="submit" disabled={createHiveMutation.isPending}>
                    {createHiveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Išsaugoti
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
                  placeholder="Ieškoti avilių..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Statusas" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isError ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center space-y-4">
              <h3 className="text-lg font-semibold">Nepavyko įkelti avilių</h3>
              <p className="text-muted-foreground">
                {getErrorMessage(error) ?? 'Įvyko nenumatyta klaida bandant gauti avilių sąrašą.'}
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
                {searchQuery || statusFilter !== 'all'
                  ? 'Pabandykite pakeisti paieškos kriterijus'
                  : 'Pradėkite pridėdami savo pirmą avilį'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
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
                  updateHiveMutation.isPending && updateHiveMutation.variables?.id === hive.id
                }
                isArchiving={
                  archiveHiveMutation.isPending && archiveHiveMutation.variables === hive.id
                }
                isDeleting={
                  deleteHiveMutation.isPending && deleteHiveMutation.variables === hive.id
                }
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
