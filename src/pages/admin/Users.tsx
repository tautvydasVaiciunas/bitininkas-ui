import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

type MutationError = HttpError | Error;

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

const defaultFormValues: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'user',
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null);
  const [formValues, setFormValues] = useState<UserFormState>(defaultFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
  });

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
        password: '',
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
    onSuccess: () => {
      toast.success('Vartotojo informacija atnaujinta');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      closeForm();
    },
    onError: (error: MutationError) => {
      setFormError(resolveErrorMessage(error));
    },
  });

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? '';
      return (
        name.includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchQuery, users]);

  const isFormOpen = isCreateOpen || editingUser !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, 'default' | 'destructive' | 'success' | 'secondary'> = {
      admin: 'destructive',
      manager: 'default',
      user: 'secondary',
    };

    const label = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
    return <Badge variant={variants[role]}>{label}</Badge>;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = formValues.email.trim();
    const trimmedName = formValues.name.trim();

    if (!trimmedEmail) {
      setFormError('El. pašto adresas privalomas.');
      return;
    }

    if (editingUser) {
      const payload: UpdateUserPayload = {
        email: trimmedEmail,
        role: formValues.role,
        name: trimmedName || null,
      };

      if (formValues.password) {
        payload.password = formValues.password;
      }

      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      if (!formValues.password || formValues.password.length < 6) {
        setFormError('Slaptažodis turi būti bent 6 simbolių.');
        return;
      }

      const payload: CreateUserPayload = {
        email: trimmedEmail,
        password: formValues.password,
        role: formValues.role,
        name: trimmedName || undefined,
      };

      createMutation.mutate(payload);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vartotojai</h1>
            <p className="text-muted-foreground mt-1">Valdykite sistemos vartotojus</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 w-4 h-4" />
            Pridėti vartotoją
          </Button>
        </div>

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti vartotojų..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vardas</TableHead>
                    <TableHead>El. paštas</TableHead>
                    <TableHead>Rolė</TableHead>
                    <TableHead>Grupės</TableHead>
                    <TableHead className="text-right">Veiksmai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nerasta vartotojų
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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

        <Dialog open={isFormOpen} onOpenChange={(open) => (!open ? closeForm() : null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Redaguoti vartotoją' : 'Naujas vartotojas'}</DialogTitle>
              <DialogDescription>
                Užpildykite vartotojo informaciją. Visi laukai, pažymėti *, yra privalomi.
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
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? 'Slaptažodis (pasirinktinai)' : 'Slaptažodis *'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formValues.password}
                  onChange={(event) => handleInputChange('password', event.target.value)}
                  placeholder={editingUser ? 'Palikite tuščią, jei nekeičiate' : 'Bent 6 simboliai'}
                  minLength={editingUser ? undefined : 6}
                  required={!editingUser}
                />
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
      </div>
    </MainLayout>
  );
}
