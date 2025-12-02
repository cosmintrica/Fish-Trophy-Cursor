import { useEffect, useState } from 'react';
import { useMessageNotification, subscribeToNotifications } from '@/hooks/useMessageNotification';
import { MessageNotification } from './MessageNotification';

export function MessageNotificationManager() {
  const { notification, hideNotification } = useMessageNotification();
  const [internalNotification, setInternalNotification] = useState(notification);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notif) => {
      setInternalNotification(notif);
    });
    return unsubscribe;
  }, []);

  if (!internalNotification) return null;

  const handleClick = () => {
    window.location.href = `/messages?context=${internalNotification.context}&thread=${internalNotification.threadRootId}`;
    hideNotification();
  };

  return (
    <MessageNotification
      senderName={internalNotification.senderName}
      senderAvatar={internalNotification.senderAvatar}
      onClick={handleClick}
      onClose={hideNotification}
      duration={5000}
    />
  );
}

