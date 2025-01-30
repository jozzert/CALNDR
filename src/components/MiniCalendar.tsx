import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

export function MiniCalendar({ currentDate, onDateSelect }: MiniCalendarProps) {
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="w-64 bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {days.map(day => (
          <button
            key={day.toString()}
            onClick={() => onDateSelect(day)}
            className={`
              p-1 text-sm rounded-full
              ${isToday(day) ? 'bg-indigo-600 text-white' : ''}
              ${!isSameMonth(day, currentDate) ? 'text-gray-400' : ''}
              hover:bg-gray-100
            `}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
} 