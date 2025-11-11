import { useCallback, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Megaphone,
  MessageCircle,
  CheckCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { type NotificationsUnreadCountResponse } from '@/lib/api';
import { mapNotificationFromApi, type Notification, type NotificationType } from '@/lib/types';
import { buildAvatarSrc } from '@/lib/avatar';

export const Topbar = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCountData } = useQuery<NotificationsUnreadCountResponse>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.unreadCount(),
    enabled: !!user,
  });

  const unreadCount = unreadCountData?.count ?? 0;
  const avatarSrc = useMemo(() => buildAvatarSrc(user?.avatarUrl), [user?.avatarUrl]);

  const {
    data: latestNotifications = [],
    isError: latestNotificationsError,
    isLoading: latestNotificationsLoading,
  } = useQuery<Notification[]>({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const items = await api.notifications.list({ limit: 10 });
      return items
        .map(mapNotificationFromApi)
        .filter((item) => !user || item.userId === user?.id);
    },
    enabled: !!user,
  });

  const formatRelative = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) {
      return 'ką tik';
    }

    if (minutes < 60) {
      return `prieš ${minutes} min.`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `prieš ${hours} val.`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
      return 'vakar';
    }

    if (days < 7) {
      return `prieš ${days} d.`;
    }

    return date.toLocaleDateString('lt-LT');
  }, []);

  const getNotificationIcon = useCallback((type: NotificationType) => {
    const icons: Record<NotificationType, JSX.Element> = {
      assignment: <Bell className="w-4 h-4 text-primary" />,
      news: <Megaphone className="w-4 h-4 text-success" />,
      message: <MessageCircle className="w-4 h-4 text-muted-foreground" />,
    };
    return icons[type] ?? <Bell className="w-4 h-4 text-muted-foreground" />;
  }, []);

  const markNotificationMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: (_, id) => {
      let wasUnread = false;
      queryClient.setQueryData<Notification[]>(['notifications', 'summary'], (current) => {
        if (!current) return current;
        return current.map((item) => {
          if (item.id !== id) {
            return item;
          }
          if (!item.isRead) {
            wasUnread = true;
          }
          return { ...item, isRead: true };
        });
      });

      queryClient.setQueryData<Notification[]>(['notifications'], (current) => {
        if (!current) return current;
        return current.map((item) => (item.id === id ? { ...item, isRead: true } : item));
      });

      if (wasUnread) {
        queryClient.setQueryData<NotificationsUnreadCountResponse | undefined>(
          ['notifications', 'unread-count'],
          (current) => ({ count: Math.max(0, (current?.count ?? 0) - 1) }),
        );
      }
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(['notifications', 'summary'], (current) =>
        current ? current.map((item) => ({ ...item, isRead: true })) : current,
      );
      queryClient.setQueryData<Notification[]>(['notifications'], (current) =>
        current ? current.map((item) => ({ ...item, isRead: true })) : current,
      );
      queryClient.setQueryData<NotificationsUnreadCountResponse | undefined>(
        ['notifications', 'unread-count'],
        () => ({ count: 0 }),
      );
    },
  });

  const openNotificationLink = useCallback(
    (link: string | null | undefined) => {
      if (!link) {
        navigate('/notifications');
        return;
      }

      if (/^https?:\/\//i.test(link)) {
        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }

      navigate(link);
    },
    [navigate],
  );

  const handleNotificationSelect = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markNotificationMutation.mutate(notification.id);
      }
      openNotificationLink(notification.link);
    },
    [markNotificationMutation, openNotificationLink],
  );

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administratorius',
      manager: 'Manageris',
      user: 'Vartotojas',
    };
    return labels[role] || role;
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:fixed lg:left-64 lg:right-0">
      <div className="flex h-full w-full flex-wrap items-center gap-3 px-4 sm:flex-nowrap sm:px-6">
        <div className="order-2 w-full min-w-0 sm:order-1 sm:w-auto sm:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ieškoti..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="order-1 flex w-full flex-wrap items-center justify-end gap-2 sm:order-2 sm:w-auto sm:flex-nowrap sm:ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 ? (
                  <Badge className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-xs bg-destructive">
                    {unreadCount}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-sm font-semibold">Pranešimai</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={markAllMutation.isLoading}
                    onClick={(event) => {
                      event.preventDefault();
                      markAllMutation.mutate();
                    }}
                  >
                    <CheckCheck className="mr-1 w-4 h-4" />
                    Visi perskaityti
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {latestNotificationsLoading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                    Įkeliama...
                  </div>
                ) : latestNotificationsError ? (
                  <div className="px-4 py-6 text-sm text-destructive text-center">
                    Nepavyko įkelti pranešimų
                  </div>
                ) : latestNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                    Nėra pranešimų
                  </div>
                ) : (
                  latestNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        notification.isRead ? '' : 'bg-muted/40'
                      }`}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleNotificationSelect(notification);
                      }}
                    >
                      <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-5 line-clamp-1">
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelative(notification.createdAt)}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/notifications');
                }}
              >
                Peržiūrėti visus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3">
                <Avatar className="w-8 h-8">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={user?.name ?? 'Avataras'} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user ? getInitials(user.name ?? user.email) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user && getRoleLabel(user.role)}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserIcon className="mr-2 w-4 h-4" />
                Profilis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" />
                Atsijungti
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
