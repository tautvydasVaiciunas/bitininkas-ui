import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import api, { HttpError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const tokenMissing = token.length === 0;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(
    tokenMissing ? 'Nuoroda neteisinga arba nebegalioja.' : null,
  );
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.auth.resetPassword>[0]) =>
      api.auth.resetPassword(payload),
    onSuccess: () => {
      setDone(true);
      setFormError(null);
      setTokenError(null);
    },
    onError: (error) => {
      const message =
        error instanceof HttpError
          ? error.message
          : 'Nuoroda neteisinga arba nebegalioja.';
      setTokenError(message);
    },
  });

  useEffect(() => {
    if (!done) {
      return;
    }

    const timer = setTimeout(() => navigate('/auth/login'), 1500);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (tokenMissing) {
      setTokenError('Nuoroda neteisinga arba nebegalioja.');
      return;
    }

    if (!password || !confirmPassword) {
      setFormError('Užpildykite abu laukus.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Slaptažodžiai nesutampa.');
      return;
    }

    setFormError(null);
    mutation.mutate({ token, newPassword: password });
  };

  const description = tokenError
    ? tokenError
    : done
    ? 'Slaptažodis atnaujintas. Tuoj būsite nukreipti į prisijungimą.'
    : 'Įveskite naują slaptažodį ir dar kartą patvirtinkite.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-custom-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Atstatyti slaptažodį</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
            <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-foreground">
                <p>Slaptažodis atnaujintas. Jei nepavyksta prisijungti, bandykite dar kartą.</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Grįžti į prisijungimą
                </Link>
              </Button>
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-4 text-sm text-foreground">
                <p>{tokenError}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Grįžti į prisijungimą
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Naujas slaptažodis</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Pakartokite naują slaptažodį</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              {formError ? (
                <p className="text-xs text-foreground">{formError}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Atnaujinti slaptažodį
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
