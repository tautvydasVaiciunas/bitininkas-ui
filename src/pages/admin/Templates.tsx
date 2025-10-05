import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { mapTaskFromApi, type Task } from '@/lib/types';
import { Plus, Search, Edit } from 'lucide-react';

export default function AdminTemplates() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tasks = [], isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks', 'admin', 'list'],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return tasks;
    return tasks.filter((task) => {
      const titleMatches = task.title.toLowerCase().includes(normalizedQuery);
      const descriptionMatches = task.description?.toLowerCase().includes(normalizedQuery) ?? false;
      return titleMatches || descriptionMatches;
    });
  }, [searchQuery, tasks]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administratoriaus užduočių biblioteka</h1>
            <p className="text-muted-foreground mt-1">Valdykite bendrinamas užduotis, naudojamas kaip šablonus</p>
          </div>
          <Button>
            <Plus className="mr-2 w-4 h-4" />
            Nauja užduotis
          </Button>
        </div>

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti šablonų..."
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
              <div className="py-12 text-center text-destructive">Nepavyko įkelti užduočių.</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nerasta užduočių
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Numatyta trukmė: {task.defaultDueDays} d.
              </span>
              <Badge variant="outline">{task.frequency}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm">
              <Edit className="mr-2 w-4 h-4" />
              Redaguoti
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
