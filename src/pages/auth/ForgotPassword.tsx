import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Box, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { HttpError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.forgotPassword(email);
      setSent(true);
      setDevToken(response.token);
      toast.success('Slaptažodžio atstatymo nuoroda išsiusta.');
    } catch (error) {
      const message = (() => {
        if (error instanceof HttpError) {
          if (error.data && typeof error.data === 'object' && 'message' in error.data) {
            return (error.data as { message?: string }).message ?? 'Nepavyko išsiusti nuorodos.';
          }
          return error.message;
        }
        if (error instanceof Error) {
          return error.message;
        }
        return 'Nepavyko išsiusti nuorodos.';
      })();

      toast.error('Nepavyko išsiusti nuorodos.', { description: message });
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
          <CardTitle className="text-2xl">Pamiršai slaptažodi?</CardTitle>
          <CardDescription>
            {sent
              ? 'Patikrink el. pašta ir sek atstatymo nuoroda.'
              : 'Irašyk savo el. pašto adresa ir atsiusime atstatymo nuoroda.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success-foreground">
                <p>
                  Atstatymo nuoroda išsiusta adresu <strong>{email}</strong>.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Jei žinutes nematai, patikrink šlamšto aplanka.
                </p>
                {devToken ? (
                  <p className="mt-3 text-xs font-mono break-all text-muted-foreground">
                    Dev tokenas: {devToken}
                  </p>
                ) : null}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Grižti i prisijungima
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">El. paštas</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vardas@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Siusti nuoroda
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Grižti i prisijungima
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
