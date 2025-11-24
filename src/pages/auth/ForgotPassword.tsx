import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Box, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { HttpError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const successMessage =
  'Jei toks el. pašto adresas yra sistemoje, atstatymo nuoroda išsiųsta. Patikrink pašto dėžutę (įskaitant šlamštą).';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('Įveskite galiojantį el. paštą.');
      setLoading(false);
      return;
    }

    try {
      await api.auth.forgotPassword(normalizedEmail);
      setSent(true);
      toast.success(successMessage);
    } catch (error) {
      if (error instanceof HttpError) {
        setSent(true);
        toast.success(successMessage);
      } else {
        toast.error('Nepavyko išsiųsti nuorodos. Patikrinkite interneto ryšį.');
      }
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
          <CardTitle className="text-2xl">Pamiršai slaptažodį?</CardTitle>
          <CardDescription>
            {sent
              ? successMessage
              : 'Įrašyk savo el. pašto adresą ir atsiųsime atstatymo nuorodą.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success-foreground">
                <p>{successMessage}</p>
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
                Siųsti nuorodą
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Grįžti į prisijungimą
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
