import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { StoreLayout } from './StoreLayout';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from './utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  companyCode: '',
  vatCode: '',
  address: '',
  comment: '',
};

const StoreCheckout = () => {
  const navigate = useNavigate();
  const { items, totalAmountCents, clearCart } = useCart();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartSummary = useMemo(
    () =>
      items.map((item) => ({
        id: item.productId,
        title: item.title,
        quantity: item.quantity,
        total: item.priceCents * item.quantity,
      })),
    [items],
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Vardas privalomas';
    if (!form.email.trim()) nextErrors.email = 'El. paštas privalomas';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Netinkamas el. pašto adresas';
    }
    if (!form.phone.trim()) nextErrors.phone = 'Telefonas privalomas';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) return;
    if (!validate()) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await api.store.createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          companyName: form.companyName.trim() || undefined,
          companyCode: form.companyCode.trim() || undefined,
          vatCode: form.vatCode.trim() || undefined,
          address: form.address.trim() || undefined,
          comment: form.comment.trim() || undefined,
        },
      });
      clearCart();
      navigate('/parduotuve/sekme');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nepavyko pateikti užsakymo.';
      setSubmitError(message || 'Nepavyko pateikti užsakymo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <StoreLayout>
        <div className="rounded-lg border bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-muted-foreground">Krepšelis tuščias.</p>
          <Button asChild>
            <Link to="/parduotuve">Grįžti į parduotuvę</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Užsakymas</h1>
        <p className="text-muted-foreground">
          Užpildykite savo kontaktus ir pateikite užsakymą. Išankstinę sąskaitą atsiųsime el. paštu.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Vardas ir pavardė *</label>
              <Input
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">El. paštas *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Telefonas *</label>
              <Input
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Įmonės pavadinimas</label>
              <Input
                value={form.companyName}
                onChange={(event) => handleChange('companyName', event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Įmonės kodas</label>
              <Input
                value={form.companyCode}
                onChange={(event) => handleChange('companyCode', event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">PVM kodas</label>
              <Input
                value={form.vatCode}
                onChange={(event) => handleChange('vatCode', event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Adresas</label>
            <Input
              value={form.address}
              onChange={(event) => handleChange('address', event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Komentaras</label>
            <Textarea
              value={form.comment}
              onChange={(event) => handleChange('comment', event.target.value)}
              rows={4}
            />
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertTitle>Klaida</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Siunčiama...' : 'Pateikti užsakymą'}
            </Button>
          </div>
        </form>

        <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Krepšelio santrauka</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {cartSummary.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Iš viso</p>
            <p className="text-2xl font-semibold">{formatPrice(totalAmountCents)}</p>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreCheckout;
