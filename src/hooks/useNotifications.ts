import { useEffect } from 'react';
import { Event } from '../types';

export function useNotifications(events: Event[]) {
  useEffect(() => {
    if (!('Notification' in window)) {
      return;
    }

    const checkUpcomingEvents = () => {
      const now = new Date();
      events.forEach(event => {
        const eventStart = new Date(event.start_time);
        const timeDiff = eventStart.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / 1000 / 60);

        if (minutesDiff === 15) { // 15 minutes before event
          new Notification(`Upcoming Event: ${event.title}`, {
            body: `Starting in 15 minutes`,
            icon: '/calendar-icon.png'
          });
        }
      });
    };

    Notification.requestPermission();
    const interval = setInterval(checkUpcomingEvents, 60000);
    return () => clearInterval(interval);
  }, [events]);
} 