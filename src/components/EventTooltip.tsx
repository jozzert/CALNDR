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
    <div className="p-3 max-w-sm bg-white rounded-lg shadow-lg">
      <div className="space-y-3">
        {/* Title with category color as background */}
        <div 
          className="px-3 py-2 -mt-3 -mx-3 rounded-t-lg mb-2"
          style={{ 
            backgroundColor: event.event_type.color,
            color: '#FFFFFF'
          }}
        >
          <div className="font-semibold text-base">{event.title}</div>
        </div>
        
        {/* Time */}
        <div className="flex items-center text-gray-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
        
        {/* Location */}
        {event.location && (
          <div className="flex items-center text-gray-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}

        {/* Team */}
        {event.team && (
          <div className="flex items-center text-gray-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{event.team.name}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="text-gray-600 border-t pt-2 mt-2 text-sm">
            {event.description}
          </div>
        )}
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
      className="shadow-xl"
      theme="light"
    >
      <div>{children}</div>
    </Tippy>
  );
} 