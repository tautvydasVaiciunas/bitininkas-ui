import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { mockHives, mockAssignments } from '@/lib/mockData';
import { Box, ListTodo, CheckCircle2, AlertCircle, MapPin, Calendar, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filter data based on user role
  const userHives = isAdmin ? mockHives : mockHives.filter(h => h.ownerId === user?.id);
  const userAssignments = isAdmin ? mockAssignments : mockAssignments.filter(a => a.assignedTo === user?.id);
  
  const upcomingTasks = userAssignments.filter(a => a.status !== 'completed').slice(0, 5);

  // Calculate stats
  const totalHives = userHives.length;
  const totalTasks = userAssignments.length;
  const completedTasks = userAssignments.filter(a => a.status === 'completed').length;
  const overdueTasks = userAssignments.filter(a => a.status === 'overdue').length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'success' | 'secondary'; label: string }> = {
      pending: { variant: 'secondary', label: 'Laukiama' },
      in_progress: { variant: 'default', label: 'Vykdoma' },
      completed: { variant: 'success', label: 'Atlikta' },
      overdue: { variant: 'destructive', label: 'Vėluojama' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge
        variant={config.variant}
        className={config.variant === 'success' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
      >
        {config.label}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Sveiki, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Čia yra jūsų bitininkystės valdymo apžvalga
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aviliai
              </CardTitle>
              <Box className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalHives}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Viso užduočių
              </CardTitle>
              <ListTodo className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTasks}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atlikta
              </CardTitle>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{completedTasks}</div>
            </CardContent>
          </Card>

          <Card className="shadow-custom">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vėluojama
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{overdueTasks}</div>
            </CardContent>
          </Card>
        </div>

        {/* My Hives */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Mano aviliai</h2>
            <Button asChild variant="outline">
              <Link to="/hives">
                Visi aviliai
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userHives.slice(0, 3).map((hive) => (
              <Card key={hive.id} className="shadow-custom hover:shadow-custom-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{hive.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        {hive.location}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                      Aktyvus
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Įsigyta:</span>
                      <span>{formatDate(hive.acquisitionDate)}</span>
                    </div>
                    {hive.pendingTasksCount === 0 ? (
                      <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-sm text-success">
                        Nėra laukiančių užduočių
                      </div>
                    ) : (
                      <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning-foreground">
                        {hive.pendingTasksCount} laukiančios užduotys
                      </div>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/hives/${hive.id}`}>Peržiūrėti</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Artėjančios užduotys</h2>
            <Button asChild variant="outline">
              <Link to="/tasks">
                Visos užduotys
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          <Card className="shadow-custom">
            <CardContent className="p-0">
              {upcomingTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Šiuo metu nėra artėjančių užduočių
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingTasks.map((assignment) => (
                    <div key={assignment.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{assignment.task.name}</h3>
                            <p className="text-sm text-muted-foreground">{assignment.task.description}</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Box className="w-4 h-4 text-muted-foreground" />
                              <span>{assignment.hive.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Terminas: {formatDate(assignment.dueDate)}</span>
                              {isOverdue(assignment.dueDate) && (
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

                        <div className="flex flex-col items-end gap-3">
                          {getStatusBadge(assignment.status)}
                          <Button asChild size="sm">
                            <Link to={`/tasks/${assignment.id}/run`}>Vykdyti</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
