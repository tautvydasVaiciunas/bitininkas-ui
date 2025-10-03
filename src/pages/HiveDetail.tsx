import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { mockHives, mockAssignments } from '@/lib/mockData';
import { MapPin, Calendar, Edit, Archive, Box, ChevronRight } from 'lucide-react';

export default function HiveDetail() {
  const { id } = useParams();
  const hive = mockHives.find(h => h.id === id);
  
  if (!hive) {
    return (
      <MainLayout>
        <Card className="shadow-custom">
          <CardContent className="p-12 text-center">
            <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Avilys nerastas</h3>
            <p className="text-muted-foreground mb-6">Avilys su šiuo ID neegzistuoja</p>
            <Button asChild>
              <Link to="/hives">Grįžti į avilius</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const hiveAssignments = mockAssignments.filter(a => a.hiveId === id);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{hive.name}</h1>
              <Badge variant={hive.status === 'active' ? 'success' : 'secondary'}>
                {hive.status === 'active' ? 'Aktyvus' : 'Neaktyvus'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {hive.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Įsigyta: {formatDate(hive.acquisitionDate)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="mr-2 w-4 h-4" />
              Redaguoti
            </Button>
            <Button variant="outline">
              <Archive className="mr-2 w-4 h-4" />
              Archyvuoti
            </Button>
          </div>
        </div>

        {/* Details Card */}
        <Card className="shadow-custom">
          <CardHeader>
            <CardTitle>Informacija</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pavadinimas</p>
                <p className="font-medium">{hive.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lokacija</p>
                <p className="font-medium">{hive.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Karalienės metai</p>
                <p className="font-medium">{hive.queenYear}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Įsigijimo data</p>
                <p className="font-medium">{formatDate(hive.acquisitionDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Statusas</p>
                <p className="font-medium">{hive.status === 'active' ? 'Aktyvus' : 'Neaktyvus'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Užduotys</TabsTrigger>
            <TabsTrigger value="history">Istorija</TabsTrigger>
            <TabsTrigger value="settings">Nustatymai</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Užduotys</CardTitle>
              </CardHeader>
              <CardContent>
                {hiveAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Šiam aviliui nėra priskirtų užduočių
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {hiveAssignments.map((assignment) => (
                      <div key={assignment.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{assignment.task.name}</h4>
                              {getStatusBadge(assignment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{assignment.task.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Terminas: {formatDate(assignment.dueDate)}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progresas</span>
                                <span className="font-medium">{assignment.progress}%</span>
                              </div>
                              <Progress value={assignment.progress} className="h-2" />
                            </div>
                          </div>
                          <Button asChild size="sm">
                            <Link to={`/tasks/${assignment.id}/run`}>
                              Vykdyti
                              <ChevronRight className="ml-2 w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Istorija</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Veiksmų istorija bus rodoma čia
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Nustatymai</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Avilio redagavimo forma bus čia
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
