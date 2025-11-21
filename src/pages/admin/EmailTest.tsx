import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api, { HttpError } from '@/lib/api';

const DEFAULT_SUBJECT = 'Test email';
const DEFAULT_BODY = 'Tai yra testinis laiškas iš Bus medaus sistemos.';

const validateEmail = (value: string) => {
  const normalized = value.trim();
  return normalized.includes('@') && normalized.includes('.');
};

export default function AdminEmailTest() {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toError, setToError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.admin.email.sendTest>[0]) =>
      api.admin.email.sendTest(payload),
    onSuccess: () => {
      toast.success('Testinis el. laiškas išsiųstas.');
    },
    onError: (error) => {
      const message =
        error instanceof HttpError
          ? error.message
          : 'Klaida siunčiant el. laišką.';
      toast.error(`Nepavyko išsiųsti el. laiško: ${message}`);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTo = to.trim();

    if (!normalizedTo) {
      setToError('Įveskite gavėjo el. paštą.');
      return;
    }

    if (!validateEmail(normalizedTo)) {
      setToError('Įveskite galiojantį el. paštą.');
      return;
    }

    setToError(null);

    mutation.mutate({
      to: normalizedTo,
      subject: subject.trim() || undefined,
      body: body.trim() || undefined,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Testinis el. laiškas</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email-test-to">Gavėjo el. paštas</Label>
                <Input
                  id="email-test-to"
                  placeholder="vartotojas@example.com"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  disabled={mutation.isPending}
                />
                {toError ? (
                  <p className="text-xs text-destructive">{toError}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-test-subject">Tema</Label>
                <Input
                  id="email-test-subject"
                  placeholder={DEFAULT_SUBJECT}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-test-body">Žinutė</Label>
                <Textarea
                  id="email-test-body"
                  placeholder={DEFAULT_BODY}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={mutation.isPending}
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Siunčiama...' : 'Siųsti testinį laišką'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
