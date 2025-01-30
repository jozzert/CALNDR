import { downloadCalendar } from '../utils/calendarExport';

function Calendar({ events }: CalendarProps) {
  return (
    <div>
      <button
        onClick={() => downloadCalendar(events)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Export Calendar
      </button>
    </div>
  );
}

export default Calendar; 