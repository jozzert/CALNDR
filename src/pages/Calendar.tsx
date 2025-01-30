import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, isSameMonth, isToday, isWithinInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm';
import EventFilters from '../components/EventFilters';
import { Event } from '../types';
import { downloadCalendar } from '../utils/calendarExport';

interface DayEvent {
  event: Event;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string; }[]>([]);
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; color: string; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const startDate = startOfWeek(firstDayOfMonth);
  const endDate = endOfWeek(lastDayOfMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    Promise.all([fetchTeams(), fetchEventTypes()]).then(() => {
      fetchEvents();
    });
  }, [currentDate, selectedTeam, selectedEventType]);

  async function fetchTeams() {
    try {
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('teams (id, name)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (userTeams) {
        setTeams(userTeams.map(ut => ut.teams).filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }

  async function fetchEventTypes() {
    try {
      const { data: organisationData } = await supabase
        .from('team_members')
        .select('teams(organisation_id)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (organisationData?.teams?.organisation_id) {
        const { data } = await supabase
          .from('event_types')
          .select('*')
          .eq('organisation_id', organisationData.teams.organisation_id)
          .order('name');

        if (data) {
          setEventTypes(data);
        }
      }
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  }

  async function fetchEvents() {
    try {
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          is_all_day,
          location,
          event_type:event_types(id, name, color),
          team:teams(id, name)
        `)
        .or(`start_time.gte.${startDate.toISOString()},end_time.gte.${startDate.toISOString()}`)
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (selectedTeam) {
        query = query.eq('team_id', selectedTeam);
      }

      if (selectedEventType) {
        query = query.eq('event_type_id', selectedEventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  const getEventsForDay = (date: Date): DayEvent[] => {
    return events
      .filter(event => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        return isWithinInterval(date, { start: eventStart, end: eventEnd }) ||
               isSameDay(date, eventStart) ||
               isSameDay(date, eventEnd);
      })
      .map(event => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        return {
          event,
          isStart: isSameDay(date, eventStart),
          isEnd: isSameDay(date, eventEnd),
          isMiddle: !isSameDay(date, eventStart) && !isSameDay(date, eventEnd) &&
                   isWithinInterval(date, { start: eventStart, end: eventEnd }),
        };
      })
      .sort((a, b) => {
        if (a.event.is_all_day !== b.event.is_all_day) {
          return a.event.is_all_day ? -1 : 1;
        }
        return new Date(a.event.start_time).getTime() - new Date(b.event.start_time).getTime();
      });
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(parseISO(event.start_time));
    setShowEventForm(true);
  };

  const renderEventCell = (dayEvent: DayEvent) => {
    const { event, isStart, isEnd, isMiddle } = dayEvent;
    const eventStart = parseISO(event.start_time);
    const eventEnd = parseISO(event.end_time);

    let timeDisplay = '';
    if (!event.is_all_day) {
      if (isStart) {
        timeDisplay = format(eventStart, 'HH:mm');
      }
    }

    const roundedClasses = [
      isStart ? 'rounded-l-sm' : '',
      isEnd ? 'rounded-r-sm' : '',
      isMiddle ? 'border-l border-r border-white/10' : '',
    ].join(' ');

    return (
      <div
        key={`${event.id}-${isStart ? 'start' : isEnd ? 'end' : 'middle'}`}
        onClick={(e) => handleEventClick(event, e)}
        className={`
          group relative px-1 py-0.5 mb-1 text-xs cursor-pointer
          hover:opacity-90 transition-opacity ${roundedClasses}
        `}
        style={{ backgroundColor: event.event_type.color }}
      >
        <div className="flex items-center space-x-1 text-white">
          {timeDisplay && (
            <span className="font-mono whitespace-nowrap">{timeDisplay}</span>
          )}
          <span className="truncate">{event.title}</span>
        </div>
        <div className="absolute hidden group-hover:block z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -top-1 left-full ml-2">
          <div className="font-semibold">{event.title}</div>
          {!event.is_all_day && (
            <div className="mt-1">
              {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
            </div>
          )}
          {event.location && (
            <div className="mt-1 text-gray-300">{event.location}</div>
          )}
        </div>
      </div>
    );
  };

  const handlePreviousMonth = () => {
    setCurrentDate(startOfMonth(subMonths(currentDate, 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(startOfMonth(addMonths(currentDate, 1)));
  };

  const handleToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const handleExportCalendar = async () => {
    try {
      await downloadCalendar(events, selectedTeam, selectedEventType);
    } catch (error) {
      setError('Failed to export calendar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportCalendar}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Export Calendar
          </button>
          <button
            onClick={handleToday}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            Today
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <EventFilters
          teams={teams}
          eventTypes={eventTypes}
          selectedTeam={selectedTeam}
          selectedEventType={selectedEventType}
          onTeamChange={setSelectedTeam}
          onEventTypeChange={setSelectedEventType}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-8">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-px border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="px-4 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {days.map((date) => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDate = isToday(date);
            const isHovered = hoveredDate?.getTime() === date.getTime();
            const dayEvents = getEventsForDay(date);

            return (
              <div
                key={date.toString()}
                className={`min-h-32 bg-white transition-all duration-200 ease-in-out cursor-pointer
                  ${!isCurrentMonth ? 'bg-gray-50' : ''}
                  ${isCurrentDate ? 'bg-blue-50' : ''}
                  ${isHovered ? 'bg-indigo-50 shadow-inner' : ''}
                  hover:bg-indigo-50 hover:shadow-inner
                  group relative
                `}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setShowEventForm(true);
                }}
                onMouseEnter={() => setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <div className="px-2 py-1">
                  <span
                    className={`text-sm inline-flex items-center justify-center w-6 h-6 rounded-full
                      ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                      ${isCurrentDate ? 'bg-blue-600 text-white' : ''}
                      ${isHovered && !isCurrentDate ? 'bg-indigo-100' : ''}
                      group-hover:bg-indigo-100
                      transition-colors duration-200
                    `}
                  >
                    {format(date, 'd')}
                  </span>
                </div>
                <div className="px-1">
                  {dayEvents.map((dayEvent) => renderEventCell(dayEvent))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEventForm && (
        <EventForm
          selectedDate={selectedDate || new Date()}
          event={selectedEvent || undefined}
          onClose={() => {
            setShowEventForm(false);
            setSelectedDate(null);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            fetchEvents();
            setShowEventForm(false);
            setSelectedDate(null);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}