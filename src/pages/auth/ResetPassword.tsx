import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import api, { HttpError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TermsModal } from '@/components/TermsModal';

const uppercaseLetterPattern = /[A-ZĄČĘĖĮŠŲŪŽ]/;

const passwordRequirements = [
  {
    id: 'length',
    label: 'Bent 8 simboliai',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Bent viena didzioji raide',
    test: (value: string) => /[A-ZĄČĘĖĮŠŲŪŽ]/.test(value),
  },
  {
    id: 'number',
    label: 'Bent vienas skaitmuo',
    test: (value: string) => /\d/.test(value),
  },
];

const getPasswordPolicyError = (value: string) => {
  if (value.length < 8) {
    return 'Slaptazodis turi buti bent 8 simboliai.';
  }
  if (!/[A-ZĄČĘĖĮŠŲŪŽ]/.test(value)) {
    return 'Slaptazodyje turi buti bent viena didzioji raide.';
  }
  if (!/\d/.test(value)) {
    return 'Slaptazodyje turi buti bent vienas skaicius.';
  }
  return null;
};

const extractBackendMessage = (error: HttpError) => {
  const data = error.data;
  if (data && typeof data === 'object') {
    const possibleMessage = (data as { message?: unknown }).message;
    if (typeof possibleMessage === 'string' && possibleMessage.trim()) {
      return possibleMessage;
    }
    if (Array.isArray(possibleMessage)) {
      const filtered = possibleMessage.filter((item): item is string => typeof item === 'string');
      if (filtered.length) {
        return filtered.join('\n');
      }
    }
  }
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  return error.message;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const tokenMissing = token.length === 0;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(
    tokenMissing ? 'Nuoroda neteisinga arba nebegalioja.' : null,
  );
  const [done, setDone] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const passwordPolicyErrorMessage = 'Slaptazodis neatitinka saugumo reikalavimu.';

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.auth.resetPassword>[0]) =>
      api.auth.resetPassword(payload),
    onSuccess: () => {
      setDone(true);
      setFormError(null);
      setTokenError(null);
    },
    onError: (error) => {
      if (error instanceof HttpError) {
        if (error.status === 400) {
          const backendMessage = extractBackendMessage(error);
          setFormError(backendMessage ?? passwordPolicyErrorMessage);
          setTokenError(null);
          return;
        }

        const backendMessage = extractBackendMessage(error);
        const resolvedTokenError =
          error.status === 401
            ? 'Nuoroda neteisinga arba nebegalioja.'
            : backendMessage ?? 'Nuoroda neteisinga arba nebegalioja.';
        setTokenError(resolvedTokenError);
        return;
      }

      setTokenError('Nuoroda neteisinga arba nebegalioja.');
    },
  });

  useEffect(() => {
    if (!done) {
      return;
    }

    const nextPath = isAuthenticated ? '/' : '/auth/login';
    const timer = setTimeout(() => navigate(nextPath), 1500);
    return () => clearTimeout(timer);
  }, [done, isAuthenticated, navigate]);

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

    const policyError = getPasswordPolicyError(password);
    if (policyError) {
      setFormError(policyError);
      return;
    }

    if (!termsAccepted) {
      setTermsError('Prašome sutikti su naudojimosi taisyklėmis.');
      return;
    }

    setTermsError(null);

    setFormError(null);
    mutation.mutate({ token, newPassword: password });
  };

  const redirectPath = isAuthenticated ? '/' : '/auth/login';
  const redirectLabel = isAuthenticated ? 'Grįžti į sistemą' : 'Grįžti į prisijungimą';
  const description = tokenError
    ? tokenError
    : done
    ? isAuthenticated
      ? 'Slaptažodis atnaujintas. Tuoj būsite nukreipti į sistemą.'
      : 'Slaptažodis atnaujintas. Tuoj būsite nukreipti į prisijungimą.'
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
                <Link to={redirectPath}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> {redirectLabel}
                </Link>
              </Button>
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-4 text-sm text-foreground">
                <p>{tokenError}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to={redirectPath}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> {redirectLabel}
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
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {passwordRequirements.map((requirement) => {
                    const satisfied = requirement.test(password);
                    return (
                      <li
                        key={requirement.id}
                        className="flex items-center gap-2"
                        aria-live="polite"
                      >
                        <span
                          className={`block h-2 w-2 flex-shrink-0 rounded-full ${
                            satisfied ? 'bg-success' : 'bg-muted-foreground/40'
                          }`}
                          aria-hidden
                        />
                        <span className={satisfied ? 'text-foreground' : undefined}>
                          {requirement.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms-accept"
                  checked={termsAccepted}
                  onCheckedChange={(value) => setTermsAccepted(Boolean(value))}
                />
                <div className="text-sm">
                  <label htmlFor="terms-accept" className="font-medium">
                    Sutinku su{' '}
                    <button
                      type="button"
                      className="text-primary underline-offset-2 underline"
                      onClick={() => setTermsModalOpen(true)}
                    >
                      Naudojimosi taisyklėmis
                    </button>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Prieš tęsdami perskaitykite taisykles.
                  </p>
                </div>
              </div>
              {termsError ? (
                <p className="text-xs text-destructive">{termsError}</p>
              ) : null}
              {formError ? (
                <p className="text-xs text-foreground" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Atnaujinti slaptažodį
              </Button>
            </form>

          )}
        </CardContent>
      </Card>
      <TermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
    </div>
  );
}
