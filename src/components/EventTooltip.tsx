import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Event } from '../types';

interface EventTooltipProps {
  event: Event;
  children: React.ReactNode;
}

export function EventTooltip({ event, children }: EventTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {showTooltip && (
        <div 
          className="
            fixed z-[100] w-64 p-4 bg-white rounded-lg shadow-xl border border-gray-200 text-sm
          "
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 'auto',
            bottom: '100%',
            marginBottom: '8px'
          }}
        >
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

          {/* Arrow */}
          <div
            className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45"
            style={{
              bottom: '-6px',
              left: '50%',
              marginLeft: '-6px'
            }}
          />
        </div>
      )}
    </div>
  );
} 