import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import api, { type UserRole } from '@/lib/api';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
  });

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

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, users]);

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: 'Administratorius',
      manager: 'Manageris',
      user: 'Vartotojas',
    };
    return labels[role];
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, 'default' | 'destructive' | 'success' | 'secondary'> = {
      admin: 'destructive',
      manager: 'default',
      user: 'secondary',
    };
    return <Badge variant={variants[role]}>{getRoleLabel(role)}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vartotojai</h1>
            <p className="text-muted-foreground mt-1">Valdykite sistemos vartotojus</p>
          </div>
          <Button>
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
                    <TableHead>Grupė</TableHead>
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
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-muted-foreground">Grupės funkcija netrukus</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user.id)}
                              disabled={deleteMutation.isLoading && userToDelete === user.id}
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
                disabled={deleteMutation.isLoading}
              >
                Ištrinti
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
