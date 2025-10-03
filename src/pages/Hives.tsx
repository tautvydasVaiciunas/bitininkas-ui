import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { mockHives } from '@/lib/mockData';
import { Box, Plus, Search, MapPin, Calendar, ChevronRight } from 'lucide-react';

export default function Hives() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAdmin = user?.role === 'admin';
  const userHives = isAdmin ? mockHives : mockHives.filter(h => h.ownerId === user?.id);

  const filteredHives = userHives.filter(hive => {
    const matchesSearch = hive.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hive.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hive.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Aviliai</h1>
            <p className="text-muted-foreground mt-1">Valdykite savo avilius</p>
          </div>
          <Button>
            <Plus className="mr-2 w-4 h-4" />
            Pridėti avilį
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-custom">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ieškoti avilių..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Statusas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visi statusai</SelectItem>
                  <SelectItem value="active">Aktyvus</SelectItem>
                  <SelectItem value="inactive">Neaktyvus</SelectItem>
                  <SelectItem value="archived">Archyvuotas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Hives Grid */}
        {filteredHives.length === 0 ? (
          <Card className="shadow-custom">
            <CardContent className="p-12 text-center">
              <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nerasta avilių</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Pabandykite pakeisti paieškos kriterijus'
                  : 'Pradėkite pridėdami savo pirmą avilį'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button>
                  <Plus className="mr-2 w-4 h-4" />
                  Pridėti avilį
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHives.map((hive) => (
              <Card key={hive.id} className="shadow-custom hover:shadow-custom-md transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{hive.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {hive.location}
                      </div>
                    </div>
                    <Badge
                      variant={hive.status === 'active' ? 'success' : 'secondary'}
                    >
                      {hive.status === 'active' ? 'Aktyvus' : 'Neaktyvus'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Įsigyta:</span>
                      <span>{formatDate(hive.acquisitionDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Karalienė:</span>
                      <span>{hive.queenYear} m.</span>
                    </div>
                  </div>

                  {hive.pendingTasksCount > 0 ? (
                    <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning-foreground">
                      {hive.pendingTasksCount} laukiančios užduotys
                    </div>
                  ) : (
                    <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-sm text-success">
                      Nėra laukiančių užduočių
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={`/hives/${hive.id}`}>
                        Peržiūrėti
                        <ChevronRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </Button>
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
