'use client';

import { useState, useEffect } from 'react';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import notificationService from '@/services/notification.service';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load notifications when component mounts
    loadNotifications();
    
    // Set up interval to check for new notifications
    const intervalId = setInterval(loadNotifications, 60000); // Check every minute
    
    // Request notification permission
    notificationService.requestPermission();
    
    return () => clearInterval(intervalId);
  }, []);
  
  const loadNotifications = () => {
    const latestNotifications = notificationService.getNotifications();
    setNotifications(latestNotifications);
    setUnreadCount(notificationService.getUnreadCount());
  };
  
  const handleNotificationClick = (notification) => {
    // Mark as read
    notificationService.markAsRead(notification.id);
    
    // Navigate to appropriate page if applicable
    if (notification.type === 'timer' && notification.roadmapId) {
      router.push(`/roadmaps/${notification.roadmapId}/learning?module=${notification.moduleIndex}&topic=${notification.topicIndex}`);
    }
    
    setIsOpen(false);
    loadNotifications();
  };
  
  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        notificationService.markAsRead(notification.id);
      }
    });
    loadNotifications();
  };
  
  const clearAllNotifications = () => {
    notificationService.clearAll();
    loadNotifications();
    setIsOpen(false);
  };
  
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-md shadow-lg overflow-hidden z-20 w-80 max-h-96 flex flex-col">
          <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
              <button 
                onClick={clearAllNotifications}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-grow">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <li 
                    key={notification.id} 
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatNotificationTime(notification.timestamp)}
                      </span>
                    </div>
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-1"></span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 