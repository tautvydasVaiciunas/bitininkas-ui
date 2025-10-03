import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { mockAssignments } from '@/lib/mockData';
import { Plus, Search, Calendar, Box, ChevronRight, ListTodo } from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAdmin = user?.role === 'admin';
  const userAssignments = isAdmin ? mockAssignments : mockAssignments.filter(a => a.assignedTo === user?.id);

  const filteredAssignments = userAssignments.filter(assignment => {
    const matchesSearch = assignment.task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'destructive' | 'success' | 'secondary'; label: string }> = {
      pending: { variant: 'secondary', label: 'Laukiama' },
      in_progress: { variant: 'default', label: 'Vykdoma' },
      completed: { variant: 'success', label: 'Atlikta' },
      overdue: { variant: 'destructive', label: 'Vėluojama' },
    };
    const item = config[status] || config.pending;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Užduotys</h1>
            <p className="text-muted-foreground mt-1">Valdykite savo bitininkystės užduotis</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Button>
              <Plus className="mr-2 w-4 h-4" />
              Sukurti užduotį
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-custom">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ieškoti užduočių..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Būsena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visos būsenos</SelectItem>
                  <SelectItem value="pending">Laukiama</SelectItem>
                  <SelectItem value="in_progress">Vykdoma</SelectItem>
                  <SelectItem value="completed">Atlikta</SelectItem>
                  <SelectItem value="overdue">Vėluojama</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {filteredAssignments.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nerasta užduočių</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Pabandykite pakeisti paieškos kriterijus'
                  : 'Šiuo metu nėra priskirtų užduočių'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="shadow-custom hover:shadow-custom-md transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{assignment.task.name}</h3>
                          <p className="text-sm text-muted-foreground">{assignment.task.description}</p>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Avilys:</span>
                          <span className="font-medium">{assignment.hive.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Terminas:</span>
                          <span className="font-medium">{formatDate(assignment.dueDate)}</span>
                          {isOverdue(assignment.dueDate) && assignment.status !== 'completed' && (
                            <Badge variant="destructive" className="ml-2">Vėluojama</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresas</span>
                          <span className="font-medium">{assignment.progress}%</span>
                        </div>
                        <Progress value={assignment.progress} className="h-2" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/tasks/${assignment.id}`}>
                          Peržiūrėti
                        </Link>
                      </Button>
                      {assignment.status !== 'completed' && (
                        <Button asChild size="sm">
                          <Link to={`/tasks/${assignment.id}/run`}>
                            Vykdyti
                            <ChevronRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
