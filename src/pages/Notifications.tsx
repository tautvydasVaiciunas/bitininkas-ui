import { useState } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { mockNotifications } from '@/lib/mockData';
import { Bell, CheckCheck, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(
    mockNotifications.filter(n => n.userId === user?.id)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    // TODO: call PATCH /notifications/:id/read
    toast.success('Pranešimas pažymėtas kaip perskaitytas');
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: call PATCH /notifications/mark-all-read
    toast.success('Visi pranešimai pažymėti kaip perskaityti');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // TODO: call DELETE /notifications/:id
    toast.success('Pranešimas ištrintas');
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      new_task: <Bell className="w-5 h-5 text-primary" />,
      deadline_approaching: <Bell className="w-5 h-5 text-warning" />,
      task_completed: <CheckCheck className="w-5 h-5 text-success" />,
    };
    return icons[type] || <Bell className="w-5 h-5 text-muted-foreground" />;
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
    const filtered = filterRead === null
      ? notifications
      : notifications.filter(n => n.read === filterRead);

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
        {filtered.map((notification) => (
          <div
            key={notification.id}
            className={`p-6 transition-colors ${
              !notification.read ? 'bg-muted/30' : 'hover:bg-muted/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">{getTypeIcon(notification.type)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <Badge variant="default" className="flex-shrink-0">Nauja</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(notification.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCheck className="mr-2 w-4 h-4" />
                        Pažymėti kaip perskaitytą
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pranešimai</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} neskaityti pranešimai` : 'Visi pranešimai perskaityti'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCheck className="mr-2 w-4 h-4" />
              Pažymėti visus kaip perskaitytus
            </Button>
          )}
        </div>

        <Card className="shadow-custom">
          <Tabs defaultValue="all" className="w-full">
            <div className="border-b border-border px-6 pt-6">
              <TabsList>
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
                {renderNotifications(null)}
              </CardContent>
            </TabsContent>

            <TabsContent value="unread" className="m-0">
              <CardContent className="p-0">
                {renderNotifications(false)}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}
