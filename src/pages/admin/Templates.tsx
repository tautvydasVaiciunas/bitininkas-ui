import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockTemplates, mockTasks } from '@/lib/mockData';
import { Plus, Search, Edit, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState(mockTemplates);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTaskNames = (taskIds: string[]) => {
    return taskIds
      .map(id => mockTasks.find(t => t.id === id)?.name)
      .filter(Boolean);
  };

  const handleDelete = (id: string) => {
    // TODO: call DELETE /templates/:id
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Šablonas ištrintas');
  };

  const handleDuplicate = (id: string) => {
    // TODO: call POST /templates/:id/duplicate
    toast.success('Šablonas dubliuotas');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Šablonai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių rinkinių šablonus</p>
          </div>
          <Button>
            <Plus className="mr-2 w-4 h-4" />
            Sukurti šabloną
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
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nerasta šablonų
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Įtrauktos užduotys ({template.taskIds.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {getTaskNames(template.taskIds).map((name, index) => (
                                <Badge key={index} variant="outline">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 w-4 h-4" />
                            Redaguoti
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(template.id)}
                          >
                            <Copy className="mr-2 w-4 h-4" />
                            Dubliuoti
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="mr-2 w-4 h-4 text-destructive" />
                            Ištrinti
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
