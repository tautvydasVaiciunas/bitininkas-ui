import { useCallback } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { type NotificationsUnreadCountResponse } from '@/lib/api';
import { type Notification, type NotificationType } from '@/lib/types';
import { mapNotificationFromApi } from '@/lib/mappers';
import { Bell, CheckCheck, Megaphone, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading, isError } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const items = await api.notifications.list({ limit: 100 });
      return items
        .map(mapNotificationFromApi)
        .filter((item) => !user || item.userId === user.id);
    },
    enabled: !!user,
    onSuccess: (data) => {
      const count = data.filter((item) => !item.isRead).length;
      queryClient.setQueryData<NotificationsUnreadCountResponse>(
        ['notifications', 'unread-count'],
        { count },
      );
    },
  });

  const { data: unreadCountData } = useQuery<NotificationsUnreadCountResponse>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.unreadCount(),
    enabled: !!user,
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const openNotificationLink = useCallback(
    (link: string) => {
      if (!link) return;
      if (/^https?:\/\//i.test(link)) {
        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }
      navigate(link);
    },
    [navigate],
  );

  const markMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: (_, id) => {
      let markedUnread = false;
      queryClient.setQueryData<Notification[]>(['notifications'], (current) => {
        if (!current) return current;
        return current.map((item) => {
          if (item.id !== id) {
            return item;
          }

          if (!item.isRead) {
            markedUnread = true;
          }

          return { ...item, isRead: true };
        });
      });

      if (markedUnread) {
        queryClient.setQueryData<NotificationsUnreadCountResponse | undefined>(
          ['notifications', 'unread-count'],
          (current) => ({ count: Math.max(0, (current?.count ?? 0) - 1) }),
        );
      }
      toast.success('Pranešimas pažymėtas kaip perskaitytas');
    },
    onError: () => {
      toast.error('Nepavyko pažymėti pranešimo');
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      let markedCount = 0;
      queryClient.setQueryData<Notification[]>(['notifications'], (current) => {
        if (!current) return current;
        return current.map((item) => {
          if (!item.isRead) {
            markedCount += 1;
          }
          return { ...item, isRead: true };
        });
      });
      if (markedCount > 0) {
        queryClient.setQueryData<NotificationsUnreadCountResponse | undefined>(
          ['notifications', 'unread-count'],
          () => ({ count: 0 }),
        );
      }
      toast.success('Visi pranešimai pažymėti kaip perskaityti');
    },
    onError: () => {
      toast.error('Nepavyko pažymėti visų pranešimų');
    },
  });

  const getTypeIcon = (type: NotificationType) => {
    const icons: Record<NotificationType, JSX.Element> = {
      assignment: <Bell className="w-5 h-5 text-primary" />,
      news: <Megaphone className="w-5 h-5 text-success" />,
      message: <MessageCircle className="w-5 h-5 text-muted-foreground" />,
    };
    return icons[type] ?? <Bell className="w-5 h-5 text-muted-foreground" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `prieš ${minutes} min.`;
      }
      return `prieš ${hours} val.`;
    } else if (days === 1) {
      return 'vakar';
    } else if (days < 7) {
      return `prieš ${days} d.`;
    }
    return date.toLocaleDateString('lt-LT');
  };

  const renderNotifications = (filterRead: boolean | null) => {
    const filtered =
      filterRead === null
        ? notifications
        : notifications.filter((notification) => notification.isRead === filterRead);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>{filterRead === false ? 'Nėra naujų pranešimų' : 'Nėra pranešimų'}</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {filtered.map((notification) => {
          const isRead = notification.isRead;
          return (
            <div
              key={notification.id}
              className={`p-6 transition-colors ${
                !isRead ? 'bg-muted/30' : 'hover:bg-muted/20'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="mt-1 shrink-0">{getTypeIcon(notification.type)}</div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-semibold">{notification.title}</h3>
                      {notification.body && (
                        <p className="whitespace-pre-line text-sm text-muted-foreground">
                          {notification.body}
                        </p>
                      )}
                    </div>
                    {!isRead && (
                      <Badge variant="default" className="shrink-0">Nauja</Badge>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {notification.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openNotificationLink(notification.link!)}
                        >
                          Peržiūrėti
                        </Button>
                      )}
                      {!isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markMutation.mutate(notification.id)}
                          disabled={markMutation.isLoading}
                        >
                          <CheckCheck className="mr-2 w-4 h-4" />
                          Pažymėti kaip perskaitytą
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pranešimai</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} neskaityti pranešimai` : 'Visi pranešimai perskaityti'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllMutation.mutate()}
              variant="outline"
              disabled={markAllMutation.isLoading}
            >
              <CheckCheck className="mr-2 w-4 h-4" />
              Pažymėti visus kaip perskaitytus
            </Button>
          )}
        </div>

        <Card className="shadow-custom">
          <Tabs defaultValue="all" className="w-full">
            <div className="border-b border-border px-6 pt-6">
              <TabsList className="flex flex-wrap gap-2">
                <TabsTrigger value="all">
                  Visi
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Neskaityti
                  {unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">Kraunama...</div>
                ) : isError ? (
                  <div className="p-12 text-center text-destructive">Nepavyko įkelti pranešimų.</div>
                ) : (
                  renderNotifications(null)
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="unread" className="m-0">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">Kraunama...</div>
                ) : isError ? (
                  <div className="p-12 text-center text-destructive">Nepavyko įkelti pranešimų.</div>
                ) : (
                  renderNotifications(false)
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}
