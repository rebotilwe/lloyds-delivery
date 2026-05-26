import React, { useState, useEffect } from 'react';
import { Bell, ShoppingBag, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function VendorNotificationBell() {
  const { socket, online } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vendor_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {}
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('vendor_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Listen for new orders
  useEffect(() => {
    if (socket && online && user?.id) {
      // Join vendor room
      socket.emit('join-vendor', user.id);

      // Listen for new orders
      socket.on('new-order', (data) => {
        console.log('🔔 New order notification:', data);
        
        const newNotification = {
          id: Date.now(),
          type: 'new_order',
          title: 'New Order Received!',
          message: `Order #${data.orderId} - R${data.orderTotal.toFixed(2)} from ${data.customerName}`,
          orderId: data.orderId,
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        // Play sound
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
        } catch(e) {}
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🍔 New Order!', {
            body: `Order #${data.orderId} - R${data.orderTotal.toFixed(2)}`,
            icon: '/logo.png',
          });
        }
        
        toast.info(`📦 New order #${data.orderId} received!`, {
          duration: 8000,
          action: {
            label: 'View Order',
            onClick: () => window.location.href = '/vendor/orders',
          },
        });
      });

      return () => {
        socket.off('new-order');
      };
    }
  }, [socket, online, user]);

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  const clearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Notifications cleared');
    }
  };

  const viewOrder = (orderId) => {
    setIsOpen(false);
    window.location.href = '/vendor/orders';
  };

  const formatTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications</p>
                  <p className="text-xs text-gray-400">New orders will appear here</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b cursor-pointer transition hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">{formatTime(notification.timestamp)}</p>
                          {notification.orderId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewOrder(notification.orderId);
                              }}
                              className="text-xs text-green-600 hover:text-green-700"
                            >
                              View Order →
                            </button>
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}