import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useToast } from '@/hooks/use-toast';
import { Notification } from '@wishlist-wizard/shared';
import { Bell, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { format } from 'date-fns';

function formatNotificationTimestamp(value: unknown): string {
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [markingNotificationId, setMarkingNotificationId] = useState<number | null>(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | null>(null);
  
  // Query for notifications
  const { data, isLoading, isError, error, refetch } = useQuery<{
    notifications: Notification[],
    unreadCount: number
  }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000, // Refresh every minute
  });
  
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? notifications.filter((notification) => !notification.isRead).length;
  
  // Mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onMutate: (id) => {
      setMarkingNotificationId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (mutationError) => {
      toast({
        title: 'Error',
        description: getApiErrorMessage(mutationError, 'Failed to mark notification as read'),
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setMarkingNotificationId(null);
    }
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      });
    },
    onError: (mutationError) => {
      toast({
        title: 'Error',
        description: getApiErrorMessage(mutationError, 'Failed to mark all notifications as read'),
        variant: 'destructive'
      });
    }
  });
  
  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }),
    onMutate: (id) => {
      setDeletingNotificationId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'Notification deleted'
      });
    },
    onError: (mutationError) => {
      toast({
        title: 'Error',
        description: getApiErrorMessage(mutationError, 'Failed to delete notification'),
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setDeletingNotificationId(null);
    }
  });
  
  // Handle notification read
  const handleNotificationRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  // Handle delete notification
  const handleDeleteNotification = (id: number) => {
    deleteNotificationMutation.mutate(id);
  };
  
  return (
    <>
      <Helmet>
        <title>Notifications | Wishlist Wizard</title>
        <meta name="description" content="Manage your notifications and alerts from Wishlist Wizard." />
      </Helmet>
      <div data-testid="notifications-page" className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Notifications</h1>
          <p className="text-gray-600 mt-2">
            Stay updated with alerts and activity
          </p>
        </div>
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        
        {notifications.length > 0 && unreadCount > 0 && (
          <Button 
            data-testid="notifications-mark-all-read"
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? 'Marking all...' : 'Mark all as read'}
          </Button>
        )}
      </div>
      
      <Separator className="mb-6" />
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">Unable to load notifications</h2>
          <p className="text-muted-foreground mb-4">{getApiErrorMessage(error, 'Please try again.')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <span data-testid="notifications-retry">Retry</span>
          </Button>
        </div>
      ) : notifications.length > 0 ? (
        <div data-testid="notifications-list" className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              data-testid={`notification-item-${notification.id}`}
              className={`p-4 border rounded-lg ${notification.isRead ? 'bg-background' : 'bg-muted/30'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium">{notification.title}</h3>
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNotification(notification.id)}
                    disabled={deleteNotificationMutation.isPending && deletingNotificationId === notification.id}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{notification.content}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-muted-foreground">
                  {formatNotificationTimestamp(notification.createdAt)}
                </span>
                
                {notification.actionUrl && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    onClick={() => handleNotificationRead(notification.id)}
                    disabled={markAsReadMutation.isPending && markingNotificationId === notification.id}
                  >
                    <Link href={notification.actionUrl}>
                      {markAsReadMutation.isPending && markingNotificationId === notification.id ? 'Opening...' : 'View'}
                    </Link>
                  </Button>
                )}
                
                {!notification.isRead && !notification.actionUrl && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleNotificationRead(notification.id)}
                    disabled={markAsReadMutation.isPending && markingNotificationId === notification.id}
                  >
                    {markAsReadMutation.isPending && markingNotificationId === notification.id ? 'Marking...' : 'Mark as read'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="notifications-empty" className="text-center py-16">
          <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">No notifications yet</h2>
          <p className="text-muted-foreground">
            You&apos;ll see notifications about activity on your wishlists here.
          </p>
        </div>
      )}
      </div>
    </>
  );
}
