import { useEffect, useState, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import api, { HttpError } from '@/lib/api';
import { mapProfileFromApi, type ChangePasswordPayload } from '@/lib/types';
import { User, Mail, Edit2, Lock, Upload } from 'lucide-react';
import { toast } from 'sonner';
import ltMessages from '@/i18n/messages.lt.json';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string }) => {
      const response = await api.profile.update(payload);
      return mapProfileFromApi(response);
    },
    onSuccess: (updated) => {
      updateUserProfile({
        name: updated.name ?? undefined,
        email: updated.email,
        phone: updated.phone ?? undefined,
        address: updated.address ?? undefined,
        avatarUrl: updated.avatarUrl ?? undefined,
      });
      toast.success('Profilis atnaujintas');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Nepavyko atnaujinti profilio');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => api.profile.changePassword(payload),
    onSuccess: () => {
      toast.success(ltMessages.profile.passwordChanged);
      setPasswordForm({ current: '', next: '', confirm: '' });
    },
    onError: (error: unknown) => {
      const message = error instanceof HttpError ? error.message : ltMessages.profile.passwordChangeFailed;
      toast.error(message || ltMessages.profile.passwordChangeFailed);
    },
  });

  useEffect(() => {
    if (user) {
      setFormValues({ name: user.name, email: user.email });
    }
  }, [user]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administratorius',
      manager: 'Manageris',
      user: 'Vartotojas',
    };
    return labels[role] || role;
  };

  const handleSave = () => {
    updateMutation.mutate(formValues);
  };

  const handlePasswordChange = () => {
    if (changePasswordMutation.isLoading) {
      return;
    }

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast.error('Įveskite visus slaptažodžio laukus');
      return;
    }

    if (passwordForm.next.length < 6) {
      toast.error('Slaptažodis turi būti bent 6 simbolių');
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('Du kartus įvesti slaptažodžiai nesutampa');
      return;
    }

    changePasswordMutation.mutate({
      oldPassword: passwordForm.current,
      newPassword: passwordForm.next,
    });
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setAvatarUploading(true);
    try {
      const response = await api.profile.uploadAvatar(formData);
      updateUserProfile({ avatarUrl: response.avatarUrl });
      toast.success('Avataras atnaujintas');
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Nepavyko įkelti avataro';
      toast.error(message);
    } finally {
      setAvatarUploading(false);
    }
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
            <p className="text-muted-foreground mt-1">Valdykite savo paskyros informaciją ir saugumą</p>
          </div>
        </div>

        <Card className="shadow-custom">
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name ?? 'Avataras'} />
                ) : (
                  <AvatarFallback className="text-xl">{getInitials(user.name ?? user.email)}</AvatarFallback>
                )}
              </Avatar>
              <Label
                htmlFor="avatar-upload"
                className="absolute -right-2 bottom-0 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border bg-background shadow"
              >
                {avatarUploading ? <Upload className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={avatarUploading}
              />
            </div>
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-2xl font-semibold">{user.name ?? user.email}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Badge variant="outline" className="text-sm">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </CardContent>
        </Card>

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
                    disabled={updateMutation.isLoading}
                    onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  >
                    {isEditing ? (updateMutation.isLoading ? 'Saugoma...' : 'Išsaugoti') : (
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
                      value={formValues.name}
                      disabled={!isEditing}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">El. paštas</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formValues.email}
                      disabled={!isEditing}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rolė</Label>
                    <Input id="role" value={getRoleLabel(user.role)} disabled />
                  </div>
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
                      value={passwordForm.current}
                      autoComplete="current-password"
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, current: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Naujas slaptažodis</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.next}
                      autoComplete="new-password"
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, next: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Patvirtink naują slaptažodį</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.confirm}
                      autoComplete="new-password"
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))
                      }
                    />
                  </div>

                  <Button onClick={handlePasswordChange} disabled={changePasswordMutation.isLoading}>
                    <Lock className="mr-2 w-4 h-4" />
                    {changePasswordMutation.isLoading ? 'Keičiama...' : 'Pakeisti slaptažodį'}
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
