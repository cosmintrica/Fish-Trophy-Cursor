import { useState, useCallback } from 'react';

interface MessageNotificationData {
  id: string;
  threadRootId: string;
  senderName: string;
  senderAvatar?: string;
  context: 'site' | 'forum';
}

let notificationState: MessageNotificationData | null = null;
let notificationListeners: Set<(notification: MessageNotificationData | null) => void> = new Set();

export function useMessageNotification() {
  const [notification, setNotification] = useState<MessageNotificationData | null>(notificationState);

  const showNotification = useCallback((data: MessageNotificationData) => {
    notificationState = data;
    notificationListeners.forEach(listener => listener(data));
    setNotification(data);
  }, []);

  const hideNotification = useCallback(() => {
    notificationState = null;
    notificationListeners.forEach(listener => listener(null));
    setNotification(null);
  }, []);

  return { notification, showNotification, hideNotification };
}

export function showMessageNotification(data: MessageNotificationData) {
  notificationState = data;
  notificationListeners.forEach(listener => listener(data));
}

export function hideMessageNotification() {
  notificationState = null;
  notificationListeners.forEach(listener => listener(null));
}

export function subscribeToNotifications(callback: (notification: MessageNotificationData | null) => void) {
  notificationListeners.add(callback);
  return () => {
    notificationListeners.delete(callback);
  };
}

