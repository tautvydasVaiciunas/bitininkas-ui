import { useState } from 'react';
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
import { mockUsers, mockGroups } from '@/lib/mockData';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(mockUsers);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administratorius',
      manager: 'Manageris',
      user: 'Vartotojas',
    };
    return labels[role] || role;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'success' | 'secondary'> = {
      admin: 'destructive',
      manager: 'default',
      user: 'secondary',
    };
    return <Badge variant={variants[role] || 'secondary'}>{getRoleLabel(role)}</Badge>;
  };

  const getGroupName = (groupId?: string) => {
    const group = mockGroups.find(g => g.id === groupId);
    return group?.name || '-';
  };

  const handleDelete = (id: string) => {
    // TODO: call DELETE /users/:id
    setUsers(prev => prev.filter(u => u.id !== id));
    setUserToDelete(null);
    toast.success('Vartotojas ištrintas');
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
                      <TableCell>{getGroupName(user.groupId)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUserToDelete(user.id)}
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
                onClick={() => userToDelete && handleDelete(userToDelete)}
                className="bg-destructive hover:bg-destructive/90"
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
