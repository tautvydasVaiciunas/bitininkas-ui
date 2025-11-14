import type { FormEvent } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import lt from "date-fns/locale/lt";
import { Edit2, Loader2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import api, { type StoreProduct } from "@/lib/api";
import { formatPrice } from "../store/utils";

const PAGE_SIZE = 10;

type ProductFormState = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  price: string;
  isActive: boolean;
  imageUrls: string[];
};

const defaultForm: ProductFormState = {
  slug: "",
  title: "",
  shortDescription: "",
  description: "",
  price: "0.00",
  isActive: true,
  imageUrls: [""],
};

const AdminStoreProducts = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(defaultForm);

  const {
    data,
    isLoading,
    isError,
    isFetching: isListFetching,
  } = useQuery({
    queryKey: ["admin-store-products", page, search, onlyActive],
    queryFn: () =>
      api.admin.store.products.list({
        page,
        limit: PAGE_SIZE,
        q: search.trim() || undefined,
        isActive: onlyActive || undefined,
      }),
    keepPreviousData: true,
  });

  const products = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const resetForm = () => {
    setFormState(defaultForm);
    setEditingProduct(null);
  };

  const closeDialog = () => {
    if (createMutation.isLoading || updateMutation.isLoading) return;
    setIsDialogOpen(false);
    resetForm();
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: StoreProduct) => {
    setEditingProduct(product);
    setFormState({
      slug: product.slug,
      title: product.title,
      shortDescription: product.shortDescription ?? "",
      description: product.description,
      price: (product.priceCents / 100).toFixed(2),
      isActive: product.isActive,
      imageUrls: product.imageUrls?.length ? product.imageUrls.slice(0, 5) : [""],
    });
    setIsDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      slug: string;
      title: string;
      shortDescription?: string | null;
      description: string;
      priceCents: number;
      isActive: boolean;
      imageUrls?: string[];
    }) => api.admin.store.products.create(payload),
    onSuccess: () => {
      toast.success("Produktas sukurtas");
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nepavyko sukurti produkto");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: {
        slug?: string;
        title?: string;
        shortDescription?: string | null;
        description?: string;
        priceCents?: number;
        isActive?: boolean;
        imageUrls?: string[];
      };
    }) => api.admin.store.products.update(payload.id, payload.data),
    onSuccess: () => {
      toast.success("Produktas atnaujintas");
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nepavyko atnaujinti produkto");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (product: StoreProduct) =>
      api.admin.store.products.update(product.id, { isActive: !product.isActive }),
    onSuccess: (_, product) => {
      toast.success(
        product.isActive
          ? "Produktas paslėptas iš parduotuvės"
          : "Produktas pažymėtas kaip aktyvus",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nepavyko atnaujinti būsenos");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPrice = Number(formState.price.replace(",", "."));
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      toast.error("Įveskite tinkamą kainą.");
      return;
    }

    const imageUrls = (formState.imageUrls ?? [])
      .map((url) => url.trim())
      .filter((url, index, arr) => url.length > 0 && arr.indexOf(url) === index)
      .slice(0, 5);

    const payload = {
      slug: formState.slug.trim(),
      title: formState.title.trim(),
      shortDescription: formState.shortDescription.trim() || null,
      description: formState.description.trim(),
      priceCents: Math.round(normalizedPrice * 100),
      isActive: formState.isActive,
      imageUrls,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Parduotuvė</h1>
            <p className="text-muted-foreground">Valdykite produktus, rodomus viešoje parduotuvėje.</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Sukurti
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Paieška pagal pavadinimą arba slug"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={onlyActive}
              onCheckedChange={(state) => {
                setOnlyActive(state === true);
                setPage(1);
              }}
            />
            Rodyti tik aktyvius
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produktų sąrašas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Pavadinimas</th>
                <th className="px-3 py-2 font-medium">Kaina</th>
                <th className="px-3 py-2 font-medium">Aktyvus</th>
                <th className="px-3 py-2 font-medium">Sukurta</th>
                <th className="px-3 py-2 font-medium text-right">Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={5} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : products.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="px-3 py-2">{product.title}</td>
                      <td className="px-3 py-2">{formatPrice(product.priceCents)}</td>
                      <td className="px-3 py-2">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <ToggleRight className="h-4 w-4" />
                            Taip
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <ToggleLeft className="h-4 w-4" />
                            Ne
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {product.createdAt
                          ? format(new Date(product.createdAt), "yyyy-MM-dd HH:mm", { locale: lt })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleMutation.mutate(product)}
                            disabled={toggleMutation.isLoading}
                          >
                            {product.isActive ? "Išjungti" : "Įjungti"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                            <Edit2 className="mr-1 h-4 w-4" />
                            Redaguoti
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {isError && (
            <p className="mt-4 text-sm text-destructive">Nepavyko įkelti duomenų.</p>
          )}

          {data && data.total === 0 && !isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Produktų nėra.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page === 1 || isListFetching}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Atgal
        </Button>
        <p className="text-sm text-muted-foreground">
          Puslapis {page} / {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={isListFetching || (data ? page >= totalPages : true)}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Pirmyn
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Redaguoti produktą" : "Naujas produktas"}</DialogTitle>
            <DialogDescription>
              Užpildykite produkto informaciją. Šie duomenys bus rodomi viešoje parduotuvėje.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formState.slug}
                onChange={(event) => setFormState((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="Pvz., pradedančiojo-rinkinys"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nuotraukos (iki 5 URL)</Label>
              <p className="text-xs text-muted-foreground">
                Įklijuokite viešas nuotraukų nuorodas. Jos bus rodomos parduotuvėje.
              </p>
              <div className="space-y-2">
                {formState.imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFormState((prev) => {
                          const next = [...prev.imageUrls];
                          next[index] = value;
                          return { ...prev, imageUrls: next };
                        });
                      }}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          imageUrls:
                            prev.imageUrls.length === 1
                              ? [""]
                              : prev.imageUrls.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Pašalinti
                    </Button>
                  </div>
                ))}
              </div>
              {formState.imageUrls.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormState((prev) => ({
                      ...prev,
                      imageUrls: [...prev.imageUrls, ""],
                    }))
                  }
                >
                  Pridėti nuotraukos nuorodą
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Pavadinimas</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Trumpas aprašymas</Label>
              <Input
                id="shortDescription"
                value={formState.shortDescription}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, shortDescription: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Aprašymas</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Kaina (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formState.price}
                onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formState.isActive}
                onCheckedChange={(state) =>
                  setFormState((prev) => ({ ...prev, isActive: state === true }))
                }
              />
              <Label htmlFor="isActive">Aktyvus (rodomas parduotuvėje)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSaving}>
                Atšaukti
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Išsaugoti
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStoreProducts;
