import React from 'react';
import { downloadCalendar } from '../utils/calendarExport';
import { CalendarProps } from '../types';

function Calendar({ events }: CalendarProps) {
  return (
    <div className="calendar-container">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => downloadCalendar(events)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Export Calendar
        </button>
      </div>
    </div>
  );
}

export default Calendar; 