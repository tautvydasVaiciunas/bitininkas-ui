import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import api from "@/lib/api";
import {
  mapGroupFromApi,
  mapNewsPostFromApi,
  mapPaginatedNewsFromApi,
  mapTemplateFromApi,
  type Group,
  type NewsPost,
  type PaginatedNews,
  type Template,
} from "@/lib/types";

interface NewsFormState {
  title: string;
  body: string;
  imageUrl: string;
  targetAll: boolean;
  groupIds: string[];
  createNews: boolean;
  createAssignment: boolean;
  templateId: string;
  sendNotifications: boolean;
  assignmentStartDate: string;
  assignmentDueDate: string;
  taskTitle: string;
}

const defaultFormState: NewsFormState = {
  title: "",
  body: "",
  imageUrl: "",
  targetAll: true,
  groupIds: [],
  createNews: true,
  createAssignment: false,
  templateId: "",
  sendNotifications: true,
  assignmentStartDate: "",
  assignmentDueDate: "",
  taskTitle: "",
};

const PAGE_SIZE = 10;

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminNews = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [formState, setFormState] = useState<NewsFormState>(defaultFormState);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [postToDelete, setPostToDelete] = useState<NewsPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: groupList = [], isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await api.groups.list();
      return response.map(mapGroupFromApi);
    },
  });

  const { data: templateList = [], isLoading: isTemplatesLoading } = useQuery<Template[]>({
    queryKey: ["templates", "all"],
    queryFn: async () => {
      const response = await api.templates.list();
      return response.map(mapTemplateFromApi);
    },
  });

  const { data: taskList = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks", "admin", "news"],
    queryFn: async () => {
      const response = await api.tasks.list();
      return response.map(mapTaskFromApi);
    },
  });

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<PaginatedNews>({
    queryKey: ["news", "admin", page],
    keepPreviousData: true,
    queryFn: async () => {
      const response = await api.news.admin.list({ page, limit: PAGE_SIZE });
      return mapPaginatedNewsFromApi(response);
    },
  });

  const newsItems = data?.data ?? [];
  const hasMore = data?.hasMore ?? false;

  const groupOptions = useMemo(
    () => groupList.map((group) => ({ id: group.id, name: group.name })),
    [groupList]
  );

  const templateOptions = useMemo(
    () => templateList.map((template) => ({ id: template.id, label: template.name })),
    [templateList]
  );

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingPost(null);
    setFormState(defaultFormState);
    setGroupError(null);
  }, []);

  const openCreateDialog = () => {
    setEditingPost(null);
    setFormState(defaultFormState);
    setGroupError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (post: NewsPost) => {
    setEditingPost(post);
    setFormState({
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl ?? "",
      targetAll: post.targetAll,
      groupIds: post.groups.map((group) => group.id),
      createNews: true,
      createAssignment: Boolean(post.attachedTaskId),
      templateId: "",
      sendNotifications: post.sendNotifications ?? true,
      assignmentStartDate: post.assignmentStartDate ?? "",
      assignmentDueDate: post.assignmentDueDate ?? "",
      taskTitle: "",
    });
    setGroupError(null);
    setIsDialogOpen(true);
  };

  const invalidateNews = () => {
    void queryClient.invalidateQueries({ queryKey: ["news"], exact: false });
    void queryClient.invalidateQueries({ queryKey: ["news", "list"], exact: false });
    void queryClient.invalidateQueries({ queryKey: ["news", "admin"], exact: false });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: NewsFormState) => {
      const prepared = buildPayload(payload);
      const result = await api.news.admin.create(prepared);
      return result ? mapNewsPostFromApi(result) : null;
    },
    onSuccess: (post) => {
      if (post) {
        toast({ title: "Naujiena sukurta", description: `„${post.title}“ paskelbta sėkmingai.` });
        invalidateNews();
        setPage(1);
      } else {
        toast({ title: "Užduotis sukurta", description: "Užduotis priskirta pasirinktoms grupėms." });
      }
      closeDialog();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Nepavyko sukurti naujienos";
      toast({ title: "Klaida", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: NewsFormState }) => {
      const prepared = buildPayload(payload);
      const result = await api.news.admin.update(id, prepared);
      return mapNewsPostFromApi(result);
    },
    onSuccess: (post) => {
      toast({ title: "Naujiena atnaujinta", description: `„${post.title}“ duomenys išsaugoti.` });
      invalidateNews();
      closeDialog();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Nepavyko atnaujinti naujienos";
      toast({ title: "Klaida", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.news.admin.remove(id),
    onSuccess: () => {
      toast({ title: "Naujiena pašalinta" });
      invalidateNews();
      setPostToDelete(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Nepavyko pašalinti naujienos";
      toast({ title: "Klaida", description: message, variant: "destructive" });
    },
  });

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.createNews && !formState.createAssignment) {
      setToggleError("Pažymėkite naujienos arba užduoties kūrimą");
      return;
    }
    setToggleError(null);

    if (!formState.targetAll && formState.groupIds.length === 0) {
      setGroupError("Pasirinkite bent vieną grupę");
      return;
    }

    if (formState.createAssignment && !formState.templateId) {
      toast({
        title: "Nepavyko išsaugoti",
        description: "Pasirinkite užduoties šabloną, kad sukurtumėte priskirtą užduotį.",
        variant: "destructive",
      });
      return;
    }

    if (!formState.title.trim() || !formState.body.trim()) {
      toast({
        title: "Nepavyko išsaugoti",
        description: "Užpildykite pavadinimą ir turinį.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPost) {
        await updateMutation.mutateAsync({ id: editingPost.id, payload: formState });
      } else {
        await createMutation.mutateAsync(formState);
      }
    } catch {
      /* klaidos jau apdorotos mutation onError */
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      setIsUploadingImage(true);
      const response = await api.media.upload(file);
      setFormState((prev) => ({ ...prev, imageUrl: response.url }));
      toast({ title: "Paveikslėlis įkeltas", description: "Nuoroda priskirta automatiškai." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nepavyko įkelti paveikslėlio";
      toast({ title: "Klaida", description: message, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Naujienų valdymas</h1>
            <p className="text-muted-foreground">Kurkite, redaguokite ir šalinkite pranešimus bendruomenei.</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nauja naujiena
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="space-y-2">
                  <SkeletonRow />
                </CardHeader>
                <CardContent className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                </CardContent>
                <CardFooter>
                  <SkeletonRow />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-destructive">
            <h2 className="text-lg font-semibold">Nepavyko įkelti naujienų sąrašo.</h2>
            <p className="mt-2 text-sm text-destructive/80">
              {error instanceof Error ? error.message : "Bandykite dar kartą vėliau."}
            </p>
          </div>
        ) : newsItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 p-12 text-center">
            <h2 className="text-xl font-semibold">Naujienų nėra</h2>
            <p className="mt-2 text-muted-foreground">Sukurkite pirmąją naujieną, kad bendruomenė gautų pranešimus.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {newsItems.map((post) => (
                <Card key={post.id} className="flex h-full flex-col overflow-hidden">
                  {post.imageUrl ? (
                    <div className="h-40 w-full overflow-hidden">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDateTime(post.createdAt)}</span>
                      {post.updatedAt !== post.createdAt ? (
                        <span>Atnaujinta: {formatDateTime(post.updatedAt)}</span>
                      ) : null}
                    </div>
                    <CardTitle className="text-2xl leading-tight">{post.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {post.targetAll ? (
                        <Badge variant="secondary" className="bg-success/90 text-success-foreground">
                          Matoma visiems
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Tik grupėms
                        </Badge>
                      )}
                      {!post.targetAll
                        ? post.groups.map((group) => (
                            <Badge key={group.id} variant="outline">
                              {group.name}
                            </Badge>
                          ))
                        : null}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {post.body.length > 240 ? `${post.body.slice(0, 240)}…` : post.body}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(post)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setPostToDelete(post)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" disabled={page === 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Ankstesnis
              </Button>
              <span className="text-sm text-muted-foreground">
                Puslapis {page}
              </span>
              <Button
                variant="outline"
                disabled={!hasMore || isFetching}
                onClick={() => setPage((p) => (hasMore ? p + 1 : p))}
              >
                Kitas
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
            <DialogContent className="max-h-[90vh] w-full sm:max-w-2xl flex flex-col overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Redaguoti naujieną" : "Nauja naujiena"}</DialogTitle>
              <DialogDescription>
                Užpildykite visus laukus ir pasirinkite matomumo nustatymus.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="news-title">Pavadinimas</Label>
                <Input
                  id="news-title"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Įveskite pavadinimą"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="news-body">Turinys</Label>
                <Textarea
                  id="news-body"
                  value={formState.body}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, body: event.target.value }))
                  }
                  placeholder="Įveskite naujienos tekstą"
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Paveikslėlis</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    value={formState.imageUrl}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, imageUrl: event.target.value }))
                    }
                    placeholder="Įklijuokite URL arba įkelkite failą"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleUploadImage(file);
                          event.target.value = "";
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="mr-2 h-4 w-4" />
                      )}
                      Įkelti
                    </Button>
                    {formState.imageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setFormState((prev) => ({ ...prev, imageUrl: "" }))}
                      >
                        Pašalinti
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Galimi URL, prasidedantys nuo /uploads/ arba http(s).
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-md border border-muted p-3">
                  <Checkbox
                    id="news-target-all"
                    checked={formState.targetAll}
                    onCheckedChange={(checked) => {
                      const value = checked === true;
                      setFormState((prev) => ({
                        ...prev,
                        targetAll: value,
                        groupIds: value ? [] : prev.groupIds,
                      }));
                      if (value) {
                        setGroupError(null);
                      }
                    }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="news-target-all" className="cursor-pointer">
                      Matomumas visiems
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Jei nuimsite pažymėjimą, pasirinkite konkrečias grupes, kurioms bus matoma naujiena.
                    </p>
                  </div>
                </div>

                {!formState.targetAll ? (
                  <div className="space-y-2">
                    <Label>Pasirinkite grupes</Label>
                    <GroupMultiSelect
                      options={groupOptions}
                      value={formState.groupIds}
                      onChange={(next) => {
                        setFormState((prev) => ({ ...prev, groupIds: next }));
                        if (next.length > 0) {
                          setGroupError(null);
                        }
                      }}
                      disabled={isGroupsLoading}
                    />
                    {groupError ? <p className="text-sm text-destructive">{groupError}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-md border border-muted p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="news-create-news"
                    checked={formState.createNews}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({
                        ...prev,
                        createNews: checked === true,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="news-create-news" className="cursor-pointer">
                      Sukurti naujieną
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pažymėkite, jei norite paskelbti naujieną pasirinktoms grupėms.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                <Checkbox
                    id="news-create-assignment"
                    checked={formState.createAssignment}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({
                        ...prev,
                        createAssignment: checked === true,
                        ...(checked === true
                          ? {}
                          : {
                              templateId: "",
                              taskTitle: "",
                              assignmentStartDate: "",
                              assignmentDueDate: "",
                            }),
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="news-create-assignment" className="cursor-pointer">
                      Sukurti užduotį
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pažymėkite, jei norite priskirti užduotį pasirinktiems vartotojams.
                    </p>
                  </div>
                </div>

                {toggleError ? (
                  <p className="text-xs text-destructive">{toggleError}</p>
                ) : null}

                {formState.createAssignment ? (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="news-task-title">Užduoties pavadinimas</Label>
                      <Input
                        id="news-task-title"
                        value={formState.taskTitle}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, taskTitle: event.target.value }))
                        }
                        disabled={isSaving}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="news-template-select">Šablonas</Label>
                      <Select
                        id="news-template-select"
                        value={formState.templateId}
                        onValueChange={(value) =>
                          setFormState((prev) => ({ ...prev, templateId: value }))
                        }
                        disabled={isTemplatesLoading || isSaving}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isTemplatesLoading ? "Kraunama..." : "Pasirinkite šabloną"} />
                        </SelectTrigger>
                        <SelectContent>
                          {templateOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="news-assignment-start">Pradžios data</Label>
                        <Input
                          id="news-assignment-start"
                          type="date"
                          value={formState.assignmentStartDate}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, assignmentStartDate: event.target.value }))
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="news-assignment-due">Pabaigos data</Label>
                        <Input
                          id="news-assignment-due"
                          type="date"
                          value={formState.assignmentDueDate}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, assignmentDueDate: event.target.value }))
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="news-send-notifications"
                        checked={formState.sendNotifications}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({ ...prev, sendNotifications: Boolean(checked) }))
                        }
                        disabled={isSaving}
                      />
                      <Label htmlFor="news-send-notifications" className="text-sm text-muted-foreground">
                        Siųsti pranešimus ir el. laiškus gavėjams
                      </Label>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSaving}>
                Atšaukti
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingPost ? "Išsaugoti" : "Paskelbti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>

      </Dialog>

      <AlertDialog open={postToDelete !== null} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Patvirtinkite šalinimą</AlertDialogTitle>
            <AlertDialogDescription>
              {postToDelete
                ? `Ar tikrai norite pašalinti naujieną „${postToDelete.title}“?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isLoading}>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isLoading}
              onClick={async () => {
                if (!postToDelete) return;
                try {
                  await deleteMutation.mutateAsync(postToDelete.id);
                } catch {
                  /* klaida apdorota */
                }
              }}
            >
              {deleteMutation.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Pašalinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

function buildPayload(state: NewsFormState) {
  const imageUrl = state.imageUrl.trim();
  const payload: Record<string, unknown> = {
    title: state.title.trim(),
    body: state.body.trim(),
    targetAll: state.targetAll,
    imageUrl: imageUrl.length ? imageUrl : null,
    groupIds: state.targetAll ? undefined : state.groupIds,
    createNews: state.createNews,
    createAssignment: state.createAssignment,
  };

  if (!state.createAssignment) {
    return payload;
  }

  return {
    ...payload,
    templateId: state.templateId || undefined,
    taskTitle: state.taskTitle.trim(),
    assignmentStartDate: state.assignmentStartDate || undefined,
    assignmentDueDate: state.assignmentDueDate || undefined,
    sendNotifications: state.sendNotifications,
  };
}

interface GroupMultiSelectProps {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

function GroupMultiSelect({ options, value, onChange, disabled }: GroupMultiSelectProps) {
  const toggleValue = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...value, id]);
    } else {
      onChange(value.filter((item) => item !== id));
    }
  };

  const label = value.length
    ? options
        .filter((option) => value.includes(option.id))
        .map((option) => option.name)
        .join(", ")
    : "Pasirinkite grupes";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="justify-between" disabled={disabled}>
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">Grupių nėra</p>
          ) : (
            options.map((option) => {
              const checked = value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(state) => toggleValue(option.id, state === true)}
                  />
                  <span className="flex-1 truncate">{option.name}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SkeletonRow = () => <Skeleton className="h-4 w-full" />;

export default AdminNews;
