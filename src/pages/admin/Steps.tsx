import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { mockSteps } from '@/lib/mockData';
import { Plus, Search, Edit, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSteps() {
  const [searchQuery, setSearchQuery] = useState('');
  const [steps, setSteps] = useState(mockSteps);
  const [showForm, setShowForm] = useState(false);

  const filteredSteps = steps.filter(step =>
    step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    step.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    // TODO: call DELETE /steps/:id
    setSteps(prev => prev.filter(s => s.id !== id));
    toast.success('Žingsnis ištrintas');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call POST /steps
    setShowForm(false);
    toast.success('Žingsnis sukurtas');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Žingsniai</h1>
            <p className="text-muted-foreground mt-1">Valdykite užduočių žingsnius</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 w-4 h-4" />
            Pridėti žingsnį
          </Button>
        </div>

        {showForm && (
          <Card className="shadow-custom">
            <CardHeader>
              <CardTitle>Naujas žingsnis</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Pavadinimas <span className="text-destructive">*</span>
                    </Label>
                    <Input id="title" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mediaType">Medijos tipas</Label>
                    <Select defaultValue="none">
                      <SelectTrigger id="mediaType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nėra</SelectItem>
                        <SelectItem value="image">Nuotrauka</SelectItem>
                        <SelectItem value="video">Vaizdo įrašas</SelectItem>
                        <SelectItem value="document">Dokumentas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Aprašymas</Label>
                    <Textarea id="description" rows={3} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="content">Turinys</Label>
                    <Textarea id="content" rows={4} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox id="requiresProof" />
                    <Label htmlFor="requiresProof" className="cursor-pointer">
                      Reikalauti įrodymų (nuotrauka)
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Sukurti</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Atšaukti
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-custom">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti žingsnių..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredSteps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nerasta žingsnių
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSteps.map((step) => (
                  <Card key={step.id} className="shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-3">
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            {step.requiresProof && (
                              <Badge variant="default" className="flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                Reikalingi įrodymai
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.contentText && (
                            <p className="text-sm text-foreground mt-2 line-clamp-2">
                              {step.contentText}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(step.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
