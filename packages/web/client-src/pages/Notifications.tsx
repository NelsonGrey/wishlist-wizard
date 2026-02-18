import React from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Notification } from '@wishlist-wizard/shared';
import { Bell, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { format } from 'date-fns';

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for notifications
  const { data, isLoading } = useQuery<{
    notifications: Notification[],
    unreadCount: number
  }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000, // Refresh every minute
  });
  
  const notifications = data?.notifications || [];
  
  // Mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
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
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      });
    }
  });
  
  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Success',
        description: 'Notification deleted'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      });
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Notifications</h1>
          <p className="text-gray-600 mt-2">
            Stay updated with alerts and activity
          </p>
        </div>
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        
        {notifications.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <Separator className="mb-6" />
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
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
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{notification.content}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
                
                {notification.actionUrl && (
                  <Link href={notification.actionUrl}>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleNotificationRead(notification.id)}
                    >
                      View
                    </Button>
                  </Link>
                )}
                
                {!notification.isRead && !notification.actionUrl && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleNotificationRead(notification.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
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