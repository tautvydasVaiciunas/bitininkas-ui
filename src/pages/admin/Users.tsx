import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import api, {
  HttpError,
  type AdminUserResponse,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserRole,
} from '@/lib/api';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administratorius' },
  { value: 'manager', label: 'Manageris' },
  { value: 'user', label: 'Vartotojas' },
];

type SubscriptionSeason = {
  label: string;
  validUntil: string;
};

const SUBSCRIPTION_SEASONS: SubscriptionSeason[] = [
  { label: '2025–2026', validUntil: '2026-06-30' },
  { label: '2026–2027', validUntil: '2027-06-30' },
  { label: '2027–2028', validUntil: '2028-06-30' },
  { label: '2028–2029', validUntil: '2029-06-30' },
  { label: '2029–2030', validUntil: '2030-06-30' },
];

const SUBSCRIPTION_OPTIONS = [
  { value: 'inactive', label: 'Neaktyvi' },
  ...SUBSCRIPTION_SEASONS.map((season) => ({
    value: season.validUntil,
    label: `${season.label} sezonas (iki ${season.validUntil})`,
  })),
];

const formatSubscriptionLabel = (value?: string | null) => {
  if (!value) {
    return 'Neaktyvi';
  }

  const season = SUBSCRIPTION_SEASONS.find((option) => option.validUntil === value);
  if (season) {
    return `${season.label} (iki ${season.validUntil})`;
  }

  return `Aktyvi iki ${value.slice(0, 10)}`;
};
type MutationError = HttpError | Error;

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
};

const defaultFormValues: UserFormState = {
  name: '',
  email: '',
  role: 'user',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null);
  const [formValues, setFormValues] = useState<UserFormState>(defaultFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const canEditSubscriptions = isAdmin || isManager;
  const [subscriptionEditor, setSubscriptionEditor] = useState<AdminUserResponse | null>(null);
  const [subscriptionSelection, setSubscriptionSelection] = useState<string>('inactive');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const queryParams = useMemo(() => {
    const normalized = searchQuery.trim().slice(0, 255);
    return { page: currentPage, limit, q: normalized } as const;
  }, [searchQuery, currentPage, limit]);

  const {
    data: usersResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; limit: number; q: string }];
      return api.users.list(params);
    },
    keepPreviousData: true,
  });

  const users = usersResponse ?? [];
  const total = usersResponse?.total ?? 0;
  const responsePage = usersResponse?.page ?? currentPage;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = total === 0 ? 0 : (responsePage - 1) * limit + 1;
  const endIndex = total === 0 ? 0 : Math.min(responsePage * limit, total);

  useEffect(() => {
    if (!usersResponse) {
      return;
    }
    if (responsePage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [usersResponse, responsePage, totalPages]);

  useEffect(() => {
    if (isCreateOpen) {
      setFormValues(defaultFormValues);
      setFormError(null);
    }
  }, [isCreateOpen]);

  useEffect(() => {
    if (editingUser) {
    setFormValues({
      name: editingUser.name ?? '',
      email: editingUser.email,
      role: editingUser.role,
    });
      setFormError(null);
    }
  }, [editingUser]);

  const handleInputChange = (field: keyof UserFormState, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingUser(null);
    setFormError(null);
    setFormValues(defaultFormValues);
  };

  const resolveErrorMessage = (error: MutationError) => {
    if (error instanceof HttpError) {
      if (error.status === 409) {
        return 'Toks el. pašto adresas jau naudojamas.';
      }
      return error.message ?? 'Įvyko klaida. Bandykite dar kartą.';
    }
    return error.message ?? 'Įvyko klaida. Bandykite dar kartą.';
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Vartotojas ištrintas');
    },
    onError: () => {
      toast.error('Nepavyko ištrinti vartotojo');
    },
    onSettled: () => {
      setUserToDelete(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => api.users.create(payload),
    onSuccess: () => {
      toast.success('Vartotojas sukurtas');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      closeForm();
    },
    onError: (error: MutationError) => {
      setFormError(resolveErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      api.users.update(id, payload),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.users.updateRole(id, { role }),
  });

  const isFormOpen = isCreateOpen || editingUser !== null;
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || updateRoleMutation.isPending;

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, 'default' | 'destructive' | 'success' | 'secondary'> = {
      admin: 'destructive',
      manager: 'default',
      user: 'secondary',
    };

    const label = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
    return <Badge variant={variants[role]}>{label}</Badge>;
  };

  const renderUserGroups = (groups: AdminUserResponse['groups']) => {
    if (!groups?.length) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {groups.map((group) => (
          <Badge key={group.id} variant="secondary" className="text-xs font-medium">
            {group.name}
          </Badge>
        ))}
      </div>
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = formValues.email.trim();
    const trimmedName = formValues.name.trim();

    if (!trimmedEmail) {
      setFormError('El. pašto adresas privalomas.');
      return;
    }

    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {};
        const normalizedExistingName = editingUser.name?.trim() ?? '';

        if (trimmedEmail !== editingUser.email) {
          payload.email = trimmedEmail;
        }

        if (trimmedName !== normalizedExistingName) {
          payload.name = trimmedName ? trimmedName : null;
        }

        const hasChanges = Object.keys(payload).length > 0;
        let roleChanged = false;

        if (isAdmin && formValues.role !== editingUser.role) {
          await updateRoleMutation.mutateAsync({
            id: editingUser.id,
            role: formValues.role,
          });
          roleChanged = true;
        }

        if (hasChanges) {
          await updateMutation.mutateAsync({ id: editingUser.id, payload });
        }

        if (hasChanges || roleChanged) {
          const message = hasChanges
            ? 'Vartotojo informacija atnaujinta'
            : 'Vartotojo rolė atnaujinta';
          toast.success(message);
          void queryClient.invalidateQueries({ queryKey: ['users'] });
          closeForm();
        } else {
          toast.info('Pakeitimų nerasta');
        }
      } else {
        const payload: CreateUserPayload = {
          email: trimmedEmail,
          name: trimmedName || undefined,
        };

        if (isAdmin) {
          payload.role = formValues.role;
        }

        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      setFormError(resolveErrorMessage(error as MutationError));
    }
  };

  useEffect(() => {
    if (!subscriptionEditor) {
      return;
    }

    setSubscriptionSelection(subscriptionEditor.subscriptionValidUntil ?? 'inactive');
  }, [subscriptionEditor]);

  const openSubscriptionEditor = (target: AdminUserResponse) => {
    setSubscriptionSelection(target.subscriptionValidUntil ?? 'inactive');
    setSubscriptionEditor(target);
  };

  const closeSubscriptionEditor = () => {
    setSubscriptionEditor(null);
  };

  const handleSubscriptionSave = async () => {
    if (!subscriptionEditor) {
      return;
    }

    const payload: UpdateUserPayload = {
      subscriptionValidUntil:
        subscriptionSelection === 'inactive' ? null : subscriptionSelection,
    };

    try {
      await updateMutation.mutateAsync({ id: subscriptionEditor.id, payload });
      toast.success('Prenumerata atnaujinta');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      closeSubscriptionEditor();
    } catch (error) {
      toast.error(resolveErrorMessage(error as MutationError));
    }
  };

  const renderLastLogin = (iso?: string | null) => {
    if (!iso) {
      return (
        <span className="flex items-center gap-1 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Niekada
        </span>
      );
    }

    const lastLogin = new Date(iso);
    const now = Date.now();
    const diffDays = (now - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

    if (Number.isNaN(diffDays)) {
      return <span className="text-sm text-foreground">—</span>;
    }

    if (diffDays >= 90) {
      return (
        <span className="flex items-center gap-1 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {lastLogin.toLocaleString('lt-LT')}
        </span>
      );
    }

    if (diffDays >= 30) {
      return (
        <span className="text-sm text-amber-500">
          {lastLogin.toLocaleString('lt-LT')}
        </span>
      );
    }

    return (
      <span className="text-sm text-foreground">{lastLogin.toLocaleString('lt-LT')}</span>
    );
  };

  const renderSubscriptionCell = (target: AdminUserResponse) => {
    const label = formatSubscriptionLabel(target.subscriptionValidUntil);

    if (!canEditSubscriptions) {
      return <span>{label}</span>;
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        className="px-0 text-sm font-medium"
        onClick={() => openSubscriptionEditor(target)}
      >
        {label}
      </Button>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vartotojai</h1>
            <p className="text-muted-foreground mt-1">Valdykite sistemos vartotojus</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 w-4 h-4" />
              Pridėti vartotoją
            </Button>
          )}
        </div>

        <Card className="shadow-custom">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ieškoti vartotojų..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Kraunama...</div>
            ) : isError ? (
              <div className="py-12 text-center text-destructive">Nepavyko įkelti vartotojų.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[48rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vardas</TableHead>
                      <TableHead>El. paštas</TableHead>
                      <TableHead>Rolė</TableHead>
                      <TableHead>Grupės</TableHead>
                      <TableHead>Prenumerata</TableHead>
                      <TableHead>Paskutinį kartą prisijungęs</TableHead>
                      <TableHead className="text-right">Veiksmai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nerasta vartotojų
                      </TableCell>
                    </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                          <TableCell className="min-w-[14rem] break-words">{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{renderUserGroups(user.groups)}</TableCell>
                          <TableCell>{renderSubscriptionCell(user)}</TableCell>
                          <TableCell>
                            {renderLastLogin(user.lastLoginAt ?? null)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUserToDelete(user.id)}
                                  disabled={deleteMutation.isPending && userToDelete === user.id}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {isLoading
                ? 'Kraunama...'
                : total === 0
                ? 'Nerasta vartotojų'
                : `Rodoma ${startIndex}-${endIndex} iš ${total}`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Puslapis {responsePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || responsePage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Ankstesnis
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || responsePage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Kitas
              </Button>
            </div>
          </CardFooter>
        </Card>

        {isAdmin && (
          <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ar tikrai norite ištrinti?</AlertDialogTitle>
                <AlertDialogDescription>
                  Šis veiksmas negalės būti atšauktas. Vartotojas bus visam laikui ištrintas iš sistemos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => userToDelete && deleteMutation.mutate(userToDelete)}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                >
                  Ištrinti
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={(open) => (!open ? closeForm() : null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Redaguoti vartotoją' : 'Naujas vartotojas'}</DialogTitle>
                <DialogDescription>
                  Užpildykite vartotojo informaciją. Sukūrus paskyrą, vartotojui bus išsiųstas prisijungimo nuorodos laiškas.
                </DialogDescription>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vardas</Label>
                <Input
                  id="name"
                  value={formValues.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  placeholder="Įrašykite vardą"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">El. paštas *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  placeholder="el.pastas@pavyzdys.lt"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rolė *</Label>
                <Select
                  value={formValues.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pasirinkite rolę" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saugoma...' : editingUser ? 'Išsaugoti' : 'Sukurti'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}

        <Dialog
          open={Boolean(subscriptionEditor)}
          onOpenChange={(open) => {
            if (!open) {
              closeSubscriptionEditor();
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Prenumerata</DialogTitle>
              <DialogDescription>Pasirinkite vartotojo sezono galiojimo datą.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={subscriptionSelection}
                onValueChange={(value) => setSubscriptionSelection(value)}
              >
                <SelectTrigger id="subscription-select">
                  <SelectValue placeholder="Pasirinkite prenumeratą" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={closeSubscriptionEditor}
                disabled={updateMutation.isPending}
              >
                Atšaukti
              </Button>
              <Button onClick={handleSubscriptionSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saugoma...' : 'Išsaugoti'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
