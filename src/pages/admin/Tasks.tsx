import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockTasks } from '@/lib/mockData';
import { Plus, Search, Edit, Archive } from 'lucide-react';

export default function AdminTasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      once: 'Vienkartinė',
      weekly: 'Kas savaitę',
      monthly: 'Kas mėnesį',
    };
    return labels[frequency] || frequency;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Užduotys</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių šablonus</p>
          </div>
          <Button>
            <Plus className="mr-2 w-4 h-4" />
            Sukurti užduotį
          </Button>
        </div>

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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Kategorija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visos kategorijos</SelectItem>
                  <SelectItem value="Patikrinimas">Patikrinimas</SelectItem>
                  <SelectItem value="Sveikata">Sveikata</SelectItem>
                  <SelectItem value="Derlius">Derlius</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredTasks.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Nerasta užduočių</h3>
              <p className="text-muted-foreground">Pabandykite pakeisti paieškos kriterijus</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="shadow-custom hover:shadow-custom-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{task.name}</h3>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <Badge variant="secondary">{task.category}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Dažnis:</span>{' '}
                          <span className="font-medium">{getFrequencyLabel(task.frequency)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Žingsnių:</span>{' '}
                          <span className="font-medium">{task.steps.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Numatytas terminas:</span>{' '}
                          <span className="font-medium">{task.defaultDueDays} d.</span>
                        </div>
                      </div>

                      {task.seasonality.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Sezonas:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {task.seasonality.map((month) => (
                              <Badge key={month} variant="outline" className="text-xs">
                                {month}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 w-4 h-4" />
                        Redaguoti
                      </Button>
                      <Button variant="outline" size="sm">
                        <Archive className="mr-2 w-4 h-4" />
                        Archyvuoti
                      </Button>
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
