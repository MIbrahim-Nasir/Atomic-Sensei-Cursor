import notificationService from './notification.service';

const timerService = {
  // Set a timer for a roadmap with a specific topic
  setLearningTimer: (roadmapId, moduleIndex, topicIndex, minutes, type = 'manual') => {
    if (typeof window !== 'undefined') {
      const now = new Date();
      const expiryTime = new Date(now.getTime() + minutes * 60 * 1000);
      
      const timer = {
        roadmapId,
        moduleIndex,
        topicIndex,
        minutes,
        type, // 'manual' or 'ai'
        startTime: now.toISOString(),
        expiryTime: expiryTime.toISOString(),
        active: true
      };
      
      // Store timer in localStorage
      localStorage.setItem('current_timer', JSON.stringify(timer));
      
      // Schedule notification
      timerService.scheduleNotification(timer);
      
      return timer;
    }
  },
  
  // Get the current timer
  getCurrentTimer: () => {
    if (typeof window !== 'undefined') {
      const timerStr = localStorage.getItem('current_timer');
      if (!timerStr) return null;
      
      const timer = JSON.parse(timerStr);
      // Check if expired
      if (new Date(timer.expiryTime) < new Date()) {
        if (timer.active) {
          // Timer is expired but not processed yet
          return { ...timer, expired: true };
        }
        return null;
      }
      
      return timer;
    }
    return null;
  },
  
  // Check if timer is expired
  checkTimerExpiry: () => {
    const timer = timerService.getCurrentTimer();
    
    if (timer && new Date(timer.expiryTime) < new Date() && timer.active) {
      // Timer has expired, mark as inactive
      timer.active = false;
      localStorage.setItem('current_timer', JSON.stringify(timer));
      
      // Return the expired timer
      return { ...timer, expired: true };
    }
    
    return null;
  },
  
  // Cancel the current timer
  cancelTimer: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_timer');
      
      // Clear any scheduled timeouts
      if (window.timerNotificationTimeout) {
        clearTimeout(window.timerNotificationTimeout);
        window.timerNotificationTimeout = null;
      }
    }
  },
  
  // Schedule a notification to be shown when timer expires
  scheduleNotification: (timer) => {
    if (typeof window !== 'undefined') {
      const now = new Date();
      const expiryTime = new Date(timer.expiryTime);
      const timeUntilExpiry = expiryTime.getTime() - now.getTime();
      
      if (timeUntilExpiry <= 0) return;
      
      // Clear any existing timeout
      if (window.timerNotificationTimeout) {
        clearTimeout(window.timerNotificationTimeout);
      }
      
      // Set timeout for notification
      window.timerNotificationTimeout = setTimeout(() => {
        // Send browser notification
        notificationService.sendBrowserNotification(
          'Time to learn! ⏰',
          {
            body: `Your learning timer has expired. It's time for your next lesson!`,
            url: `/roadmaps/${timer.roadmapId}/learning?module=${timer.moduleIndex}&topic=${timer.topicIndex}`,
          }
        );
        
        // Store notification
        notificationService.storeNotification({
          title: 'Learning Reminder',
          message: `It's time for your next lesson on your learning roadmap.`,
          type: 'timer',
          roadmapId: timer.roadmapId,
          moduleIndex: timer.moduleIndex,
          topicIndex: timer.topicIndex
        });
        
        // Update timer status
        timer.active = false;
        localStorage.setItem('current_timer', JSON.stringify(timer));
      }, timeUntilExpiry);
    }
  },
  
  // Get timer history
  getTimerHistory: () => {
    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('timer_history');
      return historyStr ? JSON.parse(historyStr) : [];
    }
    return [];
  },
  
  // Add completed timer to history
  addTimerToHistory: (timer) => {
    if (typeof window !== 'undefined') {
      const history = timerService.getTimerHistory();
      history.unshift({ ...timer, completedAt: new Date().toISOString() });
      
      // Keep only the last 20 entries
      const trimmedHistory = history.slice(0, 20);
      localStorage.setItem('timer_history', JSON.stringify(trimmedHistory));
    }
  },
  
  // Calculate time remaining in minutes and seconds
  getTimeRemaining: (timer) => {
    if (!timer) return { minutes: 0, seconds: 0, total: 0 };
    
    const now = new Date();
    const expiryTime = new Date(timer.expiryTime);
    const total = Math.max(0, expiryTime - now);
    
    const minutes = Math.floor(total / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);
    
    return { minutes, seconds, total };
  },
  
  // Format time remaining as mm:ss
  formatTimeRemaining: (timer) => {
    const { minutes, seconds } = timerService.getTimeRemaining(timer);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};

export default timerService; 