import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { mockGroups } from '@/lib/mockData';
import { User, Mail, Phone, MapPin, Users, Edit2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const userGroup = mockGroups.find(g => g.id === user?.groupId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administratorius',
      manager: 'Manageris',
      user: 'Vartotojas',
    };
    return labels[role] || role;
  };

  const handleSave = () => {
    // TODO: call PATCH /users/:id
    setIsEditing(false);
    toast.success('Profilis atnaujintas');
  };

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profilis</h1>
            <p className="text-muted-foreground mt-1">Valdykite savo paskyros informaciją</p>
          </div>
        </div>

        {/* Profile Header */}
        <Card className="shadow-custom">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="default">{getRoleLabel(user.role)}</Badge>
                  {userGroup && (
                    <Badge variant="secondary">
                      <Users className="mr-1 w-3 h-3" />
                      {userGroup.name}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {user.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {user.phone}
                    </div>
                  )}
                  {user.address && (
                    <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                      <MapPin className="w-4 h-4" />
                      {user.address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">Profilio informacija</TabsTrigger>
            <TabsTrigger value="security">Saugumas</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="shadow-custom">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Asmeninė informacija</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  >
                    {isEditing ? (
                      'Išsaugoti'
                    ) : (
                      <>
                        <Edit2 className="mr-2 w-4 h-4" />
                        Redaguoti
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Vardas ir pavardė</Label>
                    <Input
                      id="name"
                      defaultValue={user.name}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">El. paštas</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user.email}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefonas</Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue={user.phone}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rolė</Label>
                    <Input
                      id="role"
                      value={getRoleLabel(user.role)}
                      disabled
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Adresas</Label>
                    <Input
                      id="address"
                      defaultValue={user.address}
                      disabled={!isEditing}
                    />
                  </div>

                  {userGroup && (
                    <div className="space-y-2">
                      <Label htmlFor="group">Grupė</Label>
                      <Input
                        id="group"
                        value={userGroup.name}
                        disabled
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="shadow-custom">
              <CardHeader>
                <CardTitle>Slaptažodžio keitimas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Dabartinis slaptažodis</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Naujas slaptažodis</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Patvirtinti naują slaptažodį</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button onClick={() => toast.success('Slaptažodis pakeistas')}>
                    <Lock className="mr-2 w-4 h-4" />
                    Pakeisti slaptažodį
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
