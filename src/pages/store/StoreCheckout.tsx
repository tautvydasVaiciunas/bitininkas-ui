import { FormEvent, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { StoreLayout } from "./StoreLayout";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, netToGrossCents, VAT_RATE } from "./utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  comment: "",
};

const StoreCheckout = () => {
  const navigate = useNavigate();
  const { items, subtotalNetCents, vatCents, totalGrossCents, clearCart } = useCart();
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
        lineNet: item.priceCents * item.quantity,
        lineGross: netToGrossCents(item.priceCents) * item.quantity,
      })),
    [items],
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Vardas ir pavardė yra privalomi.";
    if (!form.email.trim()) {
      nextErrors.email = "El. paštas yra privalomas.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Netinkamas el. pašto adresas.";
    }
    if (!form.phone.trim()) nextErrors.phone = "Telefonas yra privalomas.";
    if (!form.address.trim()) nextErrors.address = "Adresas yra privalomas.";
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
          name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          comment: form.comment.trim() || undefined,
        },
      });
      clearCart();
      navigate("/parduotuve/sekme");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nepavyko pateikti užsakymo. Bandykite dar kartą.";
      setSubmitError(message);
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
                value={form.fullName}
                onChange={(event) => handleChange("fullName", event.target.value)}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">El. paštas *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Telefonas *</label>
              <Input
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Adresas *</label>
              <Input
                value={form.address}
                onChange={(event) => handleChange("address", event.target.value)}
                aria-invalid={Boolean(errors.address)}
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Komentaras</label>
            <Textarea
              value={form.comment}
              onChange={(event) => handleChange("comment", event.target.value)}
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
              {isSubmitting ? "Siunčiama..." : "Pateikti užsakymą"}
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
                <span>{formatPrice(item.lineGross)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tarpinė suma (be PVM)</span>
              <span className="font-medium">{formatPrice(subtotalNetCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PVM ({Math.round(VAT_RATE * 100)}%)</span>
              <span className="font-medium">{formatPrice(vatCents)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Iš viso (su PVM)</span>
              <span>{formatPrice(totalGrossCents)}</span>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
};

export default StoreCheckout;
