import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Notification } from '@wishlist-wizard/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';

type NotificationItemProps = {
  notification: Notification;
  onRead: (id: number) => void;
};

const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const [_, navigate] = useLocation();
  
  const handleClick = () => {
    // Mark as read
    onRead(notification.id);
    
    // Navigate if action URL is present
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };
  
  return (
    <div 
      className={cn(
        "p-3 border-b border-border last:border-none cursor-pointer transition-colors hover:bg-muted",
        notification.isRead ? "bg-background" : "bg-muted/30"
      )}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-sm">{notification.title}</h4>
        {!notification.isRead && (
          <div className="h-2 w-2 rounded-full bg-primary"></div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{notification.content}</p>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
};

export function NotificationDropdown() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // Query for notifications
  const { data: notificationData, isLoading } = useQuery<{
    notifications: Notification[],
    unreadCount: number
  }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000, // Refresh every minute
  });
  
  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;
  
  // Mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('PATCH', `/api/notifications/${id}/read`),
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
      apiRequest('POST', '/api/notifications/mark-all-read'),
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
  
  // Handle notification read
  const handleNotificationRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-dropdown')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="notification-dropdown relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[1.25rem] px-1 text-xs"
                variant="destructive"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80" align="end">
          <div className="flex justify-between items-center p-3 border-b border-border">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification: Notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onRead={handleNotificationRead}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Bell className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}