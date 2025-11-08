import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Box, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { HttpError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('token') ?? '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError('Truksta atstatymo nuorodos.');
      return;
    }

    if (password.length < 6) {
      setError('Slaptažodis turi buti bent 6 simboliu.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Slaptažodžiai turi sutapti.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.auth.resetPassword({ token, newPassword: password });
      toast.success('Slaptažodis atnaujintas. Prisijunk nauju slaptažodžiu.');
      navigate('/auth/login');
    } catch (err) {
      const message = (() => {
        if (err instanceof HttpError) {
          if (err.data && typeof err.data === 'object' && 'message' in err.data) {
            return (err.data as { message?: string }).message ?? 'Nepavyko atkurti slaptažodžio.';
          }
          return err.message;
        }
        if (err instanceof Error) {
          return err.message;
        }
        return 'Nepavyko atkurti slaptažodžio.';
      })();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-custom-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Box className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Nustatyk nauja slaptažodi</CardTitle>
          <CardDescription>Ivesk nauja slaptažodi ir patvirtink ji žemiau</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Naujas slaptažodis</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Pakartok slaptažodi</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Atnaujinti slaptažodi
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link to="/auth/login">
                <ArrowLeft className="mr-2 w-4 h-4" /> Grižti i prisijungima
              </Link>
            </Button>
          </form>
          {!token ? (
            <p className="mt-4 text-sm text-destructive">
              Truksta atstatymo tokeno. Patikrink ar nuoroda nukopijuota teisingai arba paprašyk naujos nuorodos.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
