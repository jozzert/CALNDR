import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { format, parseISO } from 'date-fns';
import { Event } from '../types';

interface EventTooltipProps {
  event: Event;
  children: React.ReactNode;
}

export function EventTooltip({ event, children }: EventTooltipProps) {
  const content = (
    <div className="p-2 max-w-sm">
      <div className="space-y-2">
        <div className="font-medium text-gray-900">{event.title}</div>
        
        {event.description && (
          <div className="text-gray-600 whitespace-pre-wrap">{event.description}</div>
        )}
        
        <div className="text-gray-500">
          {event.is_all_day ? (
            <span>All day</span>
          ) : (
            <>
              {format(parseISO(event.start_time), 'MMM d, h:mm a')}
              {' - '}
              {format(parseISO(event.end_time), 'h:mm a')}
            </>
          )}
        </div>
        
        {event.location && (
          <div className="text-gray-500 flex items-center">
            <span>📍 {event.location}</span>
          </div>
        )}

        {event.team && (
          <div className="text-gray-500">
            Team: {event.team.name}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: event.event_type.color }}
          />
          <span className="text-gray-500">{event.event_type.name}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Tippy 
      content={content}
      placement="top"
      arrow={true}
      duration={200}
      interactive={true}
    >
      <div>{children}</div>
    </Tippy>
  );
} 