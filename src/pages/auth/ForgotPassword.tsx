import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Loader2, ArrowLeft } from 'lucide-react';
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
  const [resetToken, setResetToken] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.auth.requestPasswordReset(email);
      setSent(true);
      setResetToken(result.token);
      toast.success('Slaptažodžio atstatymo nuoroda išsiųsta!');
    } catch (error) {
      const description = (() => {
        if (error instanceof HttpError) {
          if (
            error.data &&
            typeof error.data === 'object' &&
            'message' in error.data &&
            typeof (error.data as { message?: unknown }).message === 'string'
          ) {
            return (error.data as { message?: string }).message;
          }

          return error.message;
        }

        if (error instanceof Error) {
          return error.message;
        }

        return 'Nepavyko išsiųsti atstatymo nuorodos.';
      })();

      toast.error('Nepavyko išsiųsti atstatymo nuorodos.', {
        description,
      });
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
          <CardTitle className="text-2xl">Pamiršote slaptažodį?</CardTitle>
          <CardDescription>
            {sent
              ? 'Patikrinkite savo el. paštą'
              : 'Įveskite savo el. paštą ir atsiųsime atstatymo nuorodą'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success-foreground">
                <p>
                  Slaptažodžio atstatymo nuoroda išsiųsta į <strong>{email}</strong>
                </p>
                <p className="mt-2 text-muted-foreground">
                  Patikrinkite savo el. pašto dėžutę ir sekite instrukcijas.
                </p>
                {resetToken ? (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    Dev tokenas: <span className="break-all font-mono">{resetToken}</span>
                  </p>
                ) : null}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Grįžti į prisijungimą
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Siųsti nuorodą
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Grįžti į prisijungimą
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
