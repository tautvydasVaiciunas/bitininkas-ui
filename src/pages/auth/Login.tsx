import { useState } from 'react';
import { useNavigate, useLocation, Link, type Location } from 'react-router-dom';
import { toast } from 'sonner';
import { Box, Eye, EyeOff, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState<string | null>(null);

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from;
    const path = from ? `${from.pathname}${from.search ?? ''}` : '/';
    navigate(path, { replace: true });
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (result.success) {
      toast.success('Sėkmingai prisijungta!');
      setLoginError(null);
      const from = (location.state as { from?: Location })?.from;
      const path = from ? `${from.pathname}${from.search ?? ''}` : '/';
      navigate(path, { replace: true });
    } else {
      setLoginError('Neteisingas el. paštas arba slaptažodis.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-custom-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Box className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Prisijungimas</CardTitle>
          <CardDescription>Įveskite savo prisijungimo duomenis</CardDescription>
        </CardHeader>
        <CardContent>
          {loginError ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/40 p-4 text-sm text-foreground mb-4">
              <p>{loginError}</p>
            </div>
          ) : null}
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

            <div className="space-y-2">
              <Label htmlFor="password">Slaptažodis</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Prisiminti mane
                </Label>
              </div>
              <Link to="/auth/forgot" className="text-sm text-primary hover:underline">
                Pamiršai slaptažodį? Atkurk
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Prisijungti
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
