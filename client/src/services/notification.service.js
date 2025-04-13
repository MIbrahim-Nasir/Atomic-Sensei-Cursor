const notificationService = {
  // Request notification permissions
  requestPermission: async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  },

  // Send a browser notification
  sendBrowserNotification: (title, options = {}) => {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo.png',
        ...options,
      });

      // Add click event to notification
      notification.onclick = function() {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };
      
      return notification;
    }
  },

  // Store notification in local storage
  storeNotification: (notification) => {
    if (typeof window !== 'undefined') {
      const notifications = notificationService.getNotifications();
      const newNotification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      };
      notifications.unshift(newNotification);
      localStorage.setItem('notifications', JSON.stringify(notifications));
      return newNotification;
    }
  },

  // Get all notifications from local storage
  getNotifications: () => {
    if (typeof window !== 'undefined') {
      const notificationsStr = localStorage.getItem('notifications');
      return notificationsStr ? JSON.parse(notificationsStr) : [];
    }
    return [];
  },

  // Mark notification as read
  markAsRead: (notificationId) => {
    if (typeof window !== 'undefined') {
      const notifications = notificationService.getNotifications();
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      );
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    }
  },

  // Get unread notifications count
  getUnreadCount: () => {
    if (typeof window !== 'undefined') {
      const notifications = notificationService.getNotifications();
      return notifications.filter(notification => !notification.read).length;
    }
    return 0;
  },

  // Clear all notifications
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify([]));
    }
  }
};

export default notificationService; 